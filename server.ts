import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import {
  issueSessionToken,
  registerAccount,
  revokeSessionToken,
  verifyAccount,
  verifySessionToken,
} from './server/authStore';
import {
  correctAndStructureResumeWithAI,
  deepReviewAtsWithAI,
  evaluateAnswerWithAI,
  generateInterviewQuestionsWithAI,
  generateNextVoiceTurnWithAI,
  generateResumeWithAI,
  generateStudyPathWithAI,
  generateTopicDetailsWithAI,
  generateVoiceOpeningWithAI,
  analyzeVoiceInterviewWithAI,
  optimizeResumeWithAI,
} from './server/gemini';
import {
  extractResumeTextFromBase64,
  FileExtractionError,
} from './server/resumeExtractor';
import {
  appendVoiceQuestionTurn,
  completeVoiceSession,
  createVoiceSession,
  getVoiceSession,
  listCompletedVoiceReports,
  recordVoiceAnswerTurn,
} from './server/voiceSessionStore';
import { AVAILABLE_ROLES } from './src/data/catalog';
import type {
  ExperienceLevel,
  InterviewQuestion,
  MockFeedbackEntry,
  ResumeFormData,
  StudyLevel,
} from './src/types';
import { analyzeAtsResume } from './src/utils/atsScoring';
import { buildBaselineOptimization } from './src/utils/resumeHelpers';
import { computeTurnSpeechMetrics, type SpeechTurnMetrics, type VoiceInterviewType } from './src/utils/voiceMetrics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MockSession {
  id: string;
  role: string;
  experience_level: ExperienceLevel;
  domain: string;
  questions: InterviewQuestion[];
  current_question_index: number;
  feedback: MockFeedbackEntry[];
  created_at: string;
  completed_at?: string;
  status: 'active' | 'completed';
}

const mockSessions = new Map<string, MockSession>();

function getBearerToken(req: Request): string {
  const header = req.headers.authorization ?? '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function asString(value: unknown, maxLen = 12000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function asExperienceLevel(value: unknown): ExperienceLevel {
  if (value === 'junior' || value === 'mid' || value === 'senior') return value;
  return 'mid';
}

function asStudyLevel(value: unknown): StudyLevel {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') return value;
  return 'intermediate';
}

function formatCleanErrorMessage(raw: string, fallbackMessage: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallbackMessage;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error && typeof parsed.error.message === 'string') {
        return parsed.error.message;
      }
      if (typeof parsed.message === 'string') return parsed.message;
    } catch {
      // Keep original string if not valid JSON
    }
  }
  return trimmed;
}

function handleApiError(res: Response, err: unknown, fallbackMessage: string) {
  const rawMessage = err instanceof Error ? err.message : fallbackMessage;
  const message = formatCleanErrorMessage(rawMessage, fallbackMessage);
  const status =
    message.includes('GROQ_API_KEY') || message.includes('GEMINI_API_KEY') ? 503 : 500;
  res.status(status).json({ success: false, error: message });
}

export function createApiApp() {
  const app = express();

  app.use((req, res, next) => {
    if (req.path === '/api/ats/extract-file' || req.path === '/api/resume/correct-from-file') {
      express.json({ limit: '8mb' })(req, res, next);
    } else {
      express.json({ limit: '1mb' })(req, res, next);
    }
  });

  // ========================
  // AUTH ROUTES
  // ========================
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const name = asString(req.body?.name, 120);
    const email = asString(req.body?.email, 200);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmPassword =
      typeof req.body?.confirm_password === 'string' ? req.body.confirm_password : password;

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Passwords do not match.' });
      return;
    }

    const result = registerAccount(name, email, password);
    if (!result.user) {
      res
        .status(result.status ?? 400)
        .json({ success: false, error: result.error ?? 'Registration failed.' });
      return;
    }

    const token = issueSessionToken(result.user.id);
    res.status(201).json({ success: true, user: result.user, token });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = asString(req.body?.email, 200);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const result = verifyAccount(email, password);
    if (!result.user) {
      res.status(401).json({ success: false, error: result.error ?? 'Invalid credentials.' });
      return;
    }

    const token = issueSessionToken(result.user.id);
    res.json({ success: true, user: result.user, token });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const user = verifySessionToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }
    res.json({ success: true, user });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = getBearerToken(req);
    if (token) {
      revokeSessionToken(token);
    }
    res.json({ success: true });
  });

  // ========================
  // UTILITY ROUTES
  // ========================
  app.get('/api/roles', (_req: Request, res: Response) => {
    res.json({ success: true, roles: AVAILABLE_ROLES });
  });

  app.get('/api/experience-levels', (_req: Request, res: Response) => {
    res.json({ success: true, levels: ['junior', 'mid', 'senior'] });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      service: 'AI Interview Prep Suite',
      timestamp: new Date().toISOString(),
    });
  });

  // ========================
  // ATS CHECKER ROUTES
  // ========================
  app.post('/api/ats/extract-file', async (req: Request, res: Response) => {
    const fileName = asString(req.body?.file_name, 260);
    const contentBase64 =
      typeof req.body?.content_base64 === 'string' ? req.body.content_base64 : '';

    try {
      const extracted = await extractResumeTextFromBase64(fileName, contentBase64);
      res.json({
        success: true,
        text: extracted.text,
        file_name: extracted.fileName,
        file_type: extracted.fileType,
      });
    } catch (err) {
      if (err instanceof FileExtractionError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      handleApiError(res, err, 'Failed to extract text from uploaded file.');
    }
  });

  app.post('/api/ats/analyze', (req: Request, res: Response) => {
    const resumeText = asString(req.body?.resume_text, 25000);
    const jobDescription = asString(req.body?.job_description, 15000);

    if (!resumeText) {
      res.status(400).json({ success: false, error: 'Resume text is required.' });
      return;
    }

    const analysis = analyzeAtsResume(resumeText, jobDescription);
    res.json({ success: true, ...analysis });
  });

  app.post('/api/ats/deep-review', async (req: Request, res: Response) => {
    const resumeText = asString(req.body?.resume_text, 25000);
    const jobDescription = asString(req.body?.job_description, 15000);

    if (!resumeText) {
      res.status(400).json({ success: false, error: 'Resume text is required.' });
      return;
    }

    try {
      const review = await deepReviewAtsWithAI(resumeText, jobDescription);
      res.json({ success: true, review });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate AI ATS review.');
    }
  });

  // ========================
  // RESUME BUILDER ROUTES
  // ========================
  app.post('/api/resume/generate', async (req: Request, res: Response) => {
    const profile: ResumeFormData = {
      name: asString(req.body?.name, 120),
      email: asString(req.body?.email, 200),
      phone: asString(req.body?.phone, 60),
      target_role: asString(req.body?.target_role, 120),
      education: asString(req.body?.education, 3000),
      experience: asString(req.body?.experience, 6000),
      skills: asString(req.body?.skills, 2000),
      projects: asString(req.body?.projects, 4000),
      certifications: asString(req.body?.certifications, 2000),
    };

    if (!profile.name || !profile.email || !profile.target_role || !profile.skills) {
      res.status(400).json({
        success: false,
        error: 'Please fill in Name, Email, Target Role, and Skills.',
      });
      return;
    }

    try {
      const resume = await generateResumeWithAI(profile);
      res.json({
        success: true,
        resume,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate resume.');
    }
  });

  app.post('/api/resume/optimize', async (req: Request, res: Response) => {
    const resumeText = asString(req.body?.resume_text, 25000);
    const targetRole = asString(req.body?.target_role, 120);

    if (!resumeText || !targetRole) {
      res.status(400).json({
        success: false,
        error: 'Missing resume_text or target_role.',
      });
      return;
    }

    try {
      const suggestions = await optimizeResumeWithAI(resumeText, targetRole);
      res.json({ success: true, suggestions });
    } catch {
      // Non-blocking baseline optimization rules from the reference suite
      const baseline = buildBaselineOptimization(resumeText, targetRole);
      res.json({ success: true, suggestions: baseline });
    }
  });

  app.post('/api/resume/correct-from-file', async (req: Request, res: Response) => {
    const fileName = asString(req.body?.file_name, 260);
    const contentBase64 =
      typeof req.body?.content_base64 === 'string' ? req.body.content_base64 : '';
    const targetRole = asString(req.body?.target_role, 120);
    const additionalRequirements = asString(req.body?.additional_requirements, 2000);

    if (!fileName || !contentBase64) {
      res.status(400).json({
        success: false,
        error: 'Please upload a resume file first.',
      });
      return;
    }

    try {
      const extracted = await extractResumeTextFromBase64(fileName, contentBase64);
      const corrected = await correctAndStructureResumeWithAI({
        rawResumeText: extracted.text,
        targetRole,
        additionalRequirements,
      });

      res.json({
        success: true,
        file_name: extracted.fileName,
        file_type: extracted.fileType,
        extracted_text: extracted.text,
        profile: corrected.profile,
        resume: corrected.resume,
        corrections_summary: corrected.corrections_summary,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof FileExtractionError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      handleApiError(res, err, 'Failed to process and correct uploaded resume.');
    }
  });

  app.post('/api/resume/from-linkedin', async (req: Request, res: Response) => {
    const linkedinUrl = asString(req.body?.linkedin_url, 500);
    const linkedinText = asString(req.body?.linkedin_text, 25000);
    const targetRole = asString(req.body?.target_role, 120);
    const additionalRequirements = asString(req.body?.additional_requirements, 2000);

    if (!linkedinUrl && !linkedinText) {
      res.status(400).json({
        success: false,
        error: 'Please enter a LinkedIn profile URL or paste your LinkedIn profile details.',
      });
      return;
    }

    if (linkedinUrl) {
      try {
        const parsedUrl = new URL(linkedinUrl);
        if (!/^https?:$/i.test(parsedUrl.protocol) || !parsedUrl.hostname.toLowerCase().includes('linkedin.com')) {
          res.status(400).json({
            success: false,
            error: 'Please enter a valid LinkedIn URL (e.g., https://www.linkedin.com/in/username).',
          });
          return;
        }
      } catch {
        res.status(400).json({
          success: false,
          error: 'Please enter a valid LinkedIn URL (e.g., https://www.linkedin.com/in/username).',
        });
        return;
      }
    }

    let rawProfileText = linkedinText;

    if (!rawProfileText && linkedinUrl) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(linkedinUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          signal: controller.signal,
        });

        if (response.ok) {
          const html = await response.text();
          const isAuthWall =
            /authwall|uas\/login|Sign In\s*\|\s*LinkedIn|Join LinkedIn/i.test(html) &&
            !/experience|education|skills/i.test(html);

          if (!isAuthWall) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(
              /<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([^"']+)["']/i
            );
            const ldJsonMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
              .map((m) => m[1]?.trim())
              .filter(Boolean)
              .join('\n');

            const combined = [
              titleMatch?.[1]?.trim(),
              descMatch?.[1]?.trim(),
              ldJsonMatches,
            ]
              .filter(Boolean)
              .join('\n\n')
              .trim();

            if (combined.length >= 60) {
              rawProfileText = combined;
            }
          }
        }
      } catch {
        // Fall through to helpful guidance below
      } finally {
        clearTimeout(timer);
      }

      if (!rawProfileText) {
        res.status(422).json({
          success: false,
          error:
            'LinkedIn blocked automated access to this profile URL. Please paste your LinkedIn profile text below, or export your profile on LinkedIn (More → Save to PDF) and upload it in the Upload File tab.',
        });
        return;
      }
    }

    try {
      const combinedSource = linkedinUrl
        ? `LinkedIn Profile URL: ${linkedinUrl}\n\n${rawProfileText}`
        : rawProfileText;

      const corrected = await correctAndStructureResumeWithAI({
        rawResumeText: combinedSource,
        targetRole,
        additionalRequirements,
      });

      res.json({
        success: true,
        profile: corrected.profile,
        resume: corrected.resume,
        corrections_summary: corrected.corrections_summary,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to create resume from LinkedIn profile.');
    }
  });

  // ========================
  // INTERVIEW Q&A ROUTES
  // ========================
  app.post('/api/interview/questions', async (req: Request, res: Response) => {
    const role = asString(req.body?.role, 120);
    const experienceLevel = asExperienceLevel(req.body?.experience_level);
    const domain = asString(req.body?.domain, 120) || role;
    const rawCount = Number(req.body?.count);
    const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(15, Math.round(rawCount))) : 5;

    if (!role) {
      res.status(400).json({ success: false, error: 'Target role is required.' });
      return;
    }

    try {
      const questions = await generateInterviewQuestionsWithAI(
        role,
        experienceLevel,
        domain,
        count
      );
      res.json({ success: true, questions, count: questions.length });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate interview questions.');
    }
  });

  app.post('/api/interview/evaluate', async (req: Request, res: Response) => {
    const question = asString(req.body?.question, 2000);
    const userAnswer = asString(req.body?.user_answer, 8000);
    const idealAnswer = asString(req.body?.ideal_answer, 4000);

    if (!question || !userAnswer || !idealAnswer) {
      res.status(400).json({
        success: false,
        error: 'Question, your answer, and reference answer are required.',
      });
      return;
    }

    try {
      const feedback = await evaluateAnswerWithAI(question, userAnswer, idealAnswer);
      res.json({ success: true, feedback });
    } catch (err) {
      handleApiError(res, err, 'Failed to evaluate answer.');
    }
  });

  // ========================
  // STUDY CONCEPTS ROUTES
  // ========================
  app.post('/api/study/concepts', async (req: Request, res: Response) => {
    const role = asString(req.body?.role, 120);
    const level = asStudyLevel(req.body?.experience_level);

    if (!role) {
      res.status(400).json({ success: false, error: 'Target role is required.' });
      return;
    }

    try {
      const concepts = await generateStudyPathWithAI(role, level);
      res.json({ success: true, concepts, role, level });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate study path.');
    }
  });

  app.get('/api/study/topic/:topic', async (req: Request, res: Response) => {
    const topic = asString(req.params.topic, 160);
    const role = asString(req.query.role, 120) || 'Software Engineer';

    if (!topic) {
      res.status(400).json({ success: false, error: 'Topic is required.' });
      return;
    }

    try {
      const topicDetails = await generateTopicDetailsWithAI(topic, role);
      res.json({ success: true, topic_details: topicDetails });
    } catch (err) {
      handleApiError(res, err, 'Failed to load topic details.');
    }
  });

  app.post('/api/study/topic-from-qa', async (req: Request, res: Response) => {
    const role = asString(req.body?.role, 120) || 'Software Engineer';
    const question = asString(req.body?.question, 2000);
    const userAnswer = asString(req.body?.user_answer, 6000);
    const idealAnswer = asString(req.body?.ideal_answer, 6000);
    const keyPoints = Array.isArray(req.body?.key_points)
      ? req.body.key_points.map((p: unknown) => asString(p, 120)).filter(Boolean)
      : [];

    if (!question) {
      res.status(400).json({ success: false, error: 'Question is required.' });
      return;
    }

    const topicTitle =
      keyPoints.length > 0
        ? keyPoints.slice(0, 2).join(' & ')
        : question.replace(/\?+$/, '').slice(0, 80);

    try {
      const topicDetails = await generateTopicDetailsWithAI(topicTitle, role, {
        question,
        userAnswer,
        idealAnswer,
      });
      res.json({ success: true, topic_details: topicDetails });
    } catch (err) {
      handleApiError(res, err, 'Failed to load study concept details for this question.');
    }
  });

  // ========================
  // MOCK INTERVIEW ROUTES
  // ========================
  app.post('/api/mock-interview/start', async (req: Request, res: Response) => {
    const role = asString(req.body?.role, 120);
    const experienceLevel = asExperienceLevel(req.body?.experience_level);
    const domain = asString(req.body?.domain, 120) || role;
    const rawCount = Number(req.body?.num_questions);
    const numQuestions = Number.isFinite(rawCount)
      ? Math.max(1, Math.min(10, Math.round(rawCount)))
      : 5;

    if (!role) {
      res.status(400).json({ success: false, error: 'Target role is required.' });
      return;
    }

    try {
      const questions = await generateInterviewQuestionsWithAI(
        role,
        experienceLevel,
        domain,
        numQuestions
      );

      const sessionId = crypto.randomUUID();
      const session: MockSession = {
        id: sessionId,
        role,
        experience_level: experienceLevel,
        domain,
        questions,
        current_question_index: 0,
        feedback: [],
        created_at: new Date().toISOString(),
        status: 'active',
      };
      mockSessions.set(sessionId, session);

      res.json({
        success: true,
        session_id: sessionId,
        total_questions: questions.length,
        current_question: questions[0] ?? null,
        current_question_index: 0,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to start mock interview.');
    }
  });

  app.post('/api/mock-interview/:sessionId/next', async (req: Request, res: Response) => {
    const sessionId = asString(req.params.sessionId, 80);
    const session = mockSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Mock interview session not found.' });
      return;
    }

    const userResponse = asString(req.body?.response, 8000);
    const currentIndex = session.current_question_index;
    const currentQuestion = session.questions[currentIndex];

    if (!currentQuestion) {
      res.json({
        success: true,
        completed: true,
        total_questions: session.questions.length,
        session_id: sessionId,
      });
      return;
    }

    if (!userResponse) {
      res.status(400).json({
        success: false,
        error: 'Please enter your answer before submitting.',
      });
      return;
    }

    try {
      const feedback = await evaluateAnswerWithAI(
        currentQuestion.question,
        userResponse,
        currentQuestion.ideal_answer
      );

      const entry: MockFeedbackEntry = {
        question: currentQuestion.question,
        user_answer: userResponse,
        ideal_answer: currentQuestion.ideal_answer,
        feedback,
      };
      session.feedback.push(entry);
      session.current_question_index += 1;

      const nextIndex = session.current_question_index;
      if (nextIndex >= session.questions.length) {
        res.json({
          success: true,
          completed: true,
          total_questions: session.questions.length,
          session_id: sessionId,
          previous_feedback: entry,
        });
        return;
      }

      res.json({
        success: true,
        completed: false,
        current_question: session.questions[nextIndex],
        current_question_index: nextIndex,
        total_questions: session.questions.length,
        previous_feedback: entry,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to evaluate your response.');
    }
  });

  app.post('/api/mock-interview/:sessionId/complete', (req: Request, res: Response) => {
    const sessionId = asString(req.params.sessionId, 80);
    const session = mockSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Mock interview session not found.' });
      return;
    }

    session.status = 'completed';
    session.completed_at = new Date().toISOString();

    const avgScore =
      session.feedback.length > 0
        ? Math.round(
            session.feedback.reduce((sum, item) => sum + item.feedback.score, 0) /
              session.feedback.length
          )
        : 0;

    res.json({
      success: true,
      session_id: session.id,
      role: session.role,
      experience_level: session.experience_level,
      domain: session.domain,
      total_questions: session.questions.length,
      responses_count: session.feedback.length,
      average_score: avgScore,
      feedback: session.feedback,
      created_at: session.created_at,
      completed_at: session.completed_at,
    });
  });

  // ========================
  // VOICE ASSISTANT INTERVIEW ROUTES (SQLite persisted)
  // ========================
  app.get('/api/voice-interview/history', (_req: Request, res: Response) => {
    const history = listCompletedVoiceReports(20);
    res.json({ success: true, history });
  });

  app.post('/api/voice-interview/start', async (req: Request, res: Response) => {
    const role = asString(req.body?.role, 120);
    const rawType = asString(req.body?.interview_type, 40).toLowerCase();
    const interviewType: VoiceInterviewType =
      rawType === 'hr' || rawType === 'behavioral' ? rawType : 'technical';
    const difficulty = asExperienceLevel(req.body?.difficulty);
    const rawCount = Number(req.body?.target_questions);
    const targetQuestions = Number.isFinite(rawCount)
      ? Math.max(5, Math.min(10, Math.round(rawCount)))
      : 5;
    const consentGranted = Boolean(req.body?.consent_granted);
    const saveRawAudio = Boolean(req.body?.save_raw_audio);

    if (!consentGranted) {
      res.status(400).json({
        success: false,
        error: 'Microphone consent is required before starting a Voice Assistant session.',
      });
      return;
    }

    if (!role) {
      res.status(400).json({ success: false, error: 'Target role is required.' });
      return;
    }

    try {
      const opening = await generateVoiceOpeningWithAI(role, interviewType, difficulty);
      const sessionId = crypto.randomUUID();
      createVoiceSession({
        id: sessionId,
        role,
        interviewType,
        difficulty,
        targetQuestions,
        consentGranted,
        saveRawAudio,
        firstQuestion: opening.question,
        firstIdealAnswer: opening.ideal_answer,
      });

      res.json({
        success: true,
        session_id: sessionId,
        greeting: opening.greeting,
        current_question: opening.question,
        is_follow_up: false,
        turn_index: 0,
        target_questions: targetQuestions,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to start Voice Assistant session.');
    }
  });

  app.post('/api/voice-interview/:sessionId/next', async (req: Request, res: Response) => {
    const sessionId = asString(req.params.sessionId, 80);
    const session = getVoiceSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Voice Assistant session not found.' });
      return;
    }

    const latestTurn = session.turns[session.turns.length - 1];
    if (!latestTurn) {
      res.status(400).json({ success: false, error: 'No active question found.' });
      return;
    }

    const userAnswer = asString(req.body?.transcript, 8000);
    const skipped = Boolean(req.body?.skipped);
    const endEarly = Boolean(req.body?.end_early);
    const hasAudio = session.saveRawAudio && Boolean(req.body?.has_audio);

    if (!skipped && !userAnswer) {
      res.status(400).json({
        success: false,
        error: "I didn't catch that, please repeat or type your answer.",
      });
      return;
    }

    const rawMetrics = req.body?.metrics as Partial<SpeechTurnMetrics> | undefined;
    const finalTranscript = skipped ? '[Skipped question]' : userAnswer;
    const metrics: SpeechTurnMetrics =
      rawMetrics && typeof rawMetrics.wpm === 'number' && typeof rawMetrics.durationSeconds === 'number'
        ? {
            wordCount: Number(rawMetrics.wordCount) || 0,
            durationSeconds: Math.max(1, Number(rawMetrics.durationSeconds) || 1),
            wpm: Number(rawMetrics.wpm) || 0,
            fillerCount: Number(rawMetrics.fillerCount) || 0,
            fillerBreakdown: Array.isArray(rawMetrics.fillerBreakdown)
              ? rawMetrics.fillerBreakdown
              : [],
            pauseCount: Number(rawMetrics.pauseCount) || 0,
            longestPauseSeconds: Number(rawMetrics.longestPauseSeconds) || 0,
            avgPauseSeconds: Number(rawMetrics.avgPauseSeconds) || 0,
            volumeSteadiness: Number(rawMetrics.volumeSteadiness) || 75,
          }
        : computeTurnSpeechMetrics({
            transcript: skipped ? '' : finalTranscript,
            durationSeconds: 10,
          });

    recordVoiceAnswerTurn({
      sessionId,
      turnIndex: latestTurn.turnIndex,
      userAnswer: finalTranscript,
      metrics,
      hasAudio,
    });

    const nextIndex = latestTurn.turnIndex + 1;
    if (endEarly || nextIndex >= session.targetQuestions) {
      res.json({
        success: true,
        completed: true,
        turn_index: nextIndex,
        target_questions: session.targetQuestions,
      });
      return;
    }

    try {
      const nextTurn = await generateNextVoiceTurnWithAI({
        role: session.role,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        previousQuestion: latestTurn.question,
        userAnswer: finalTranscript,
        turnIndex: latestTurn.turnIndex,
        targetQuestions: session.targetQuestions,
        askedQuestions: session.turns.map((t) => t.question),
      });

      appendVoiceQuestionTurn({
        sessionId,
        turnIndex: nextIndex,
        question: nextTurn.question,
        idealAnswer: nextTurn.ideal_answer,
        isFollowUp: nextTurn.isFollowUp,
      });

      res.json({
        success: true,
        completed: false,
        interviewer_ack: nextTurn.interviewerAck,
        current_question: nextTurn.question,
        is_follow_up: nextTurn.isFollowUp,
        turn_index: nextIndex,
        target_questions: session.targetQuestions,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate next voice interview question.');
    }
  });

  app.post('/api/voice-interview/:sessionId/complete', async (req: Request, res: Response) => {
    const sessionId = asString(req.params.sessionId, 80);
    const session = getVoiceSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: 'Voice Assistant session not found.' });
      return;
    }

    if (session.status === 'completed' && session.report) {
      res.json({
        success: true,
        report: session.report,
        history: listCompletedVoiceReports(20),
      });
      return;
    }

    const elapsedSeconds = Math.max(1, Number(req.body?.duration_seconds) || 60);
    const completedAt = new Date().toISOString();
    const answeredTurns = session.turns.filter((t) => t.userAnswer !== null);
    const turnsToAnalyze = (answeredTurns.length > 0 ? answeredTurns : session.turns).map((t) => ({
      question: t.question,
      isFollowUp: t.isFollowUp,
      idealAnswer: t.idealAnswer,
      userAnswer: t.userAnswer ?? '(No spoken response recorded)',
      metrics:
        t.metrics ??
        computeTurnSpeechMetrics({
          transcript: t.userAnswer ?? '',
          durationSeconds: 10,
        }),
    }));

    try {
      const report = await analyzeVoiceInterviewWithAI({
        sessionId: session.id,
        role: session.role,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        createdAt: session.createdAt,
        completedAt,
        durationSeconds: elapsedSeconds,
        turns: turnsToAnalyze,
      });

      completeVoiceSession(sessionId, report);
      res.json({
        success: true,
        report,
        history: listCompletedVoiceReports(20),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to generate Voice Assistant session report.');
    }
  });

  // Unknown API endpoints return JSON 404
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found.' });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;

  // Frontend serving (Vite dev middleware in development, static dist/ in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AI Interview Prep Suite listening on http://localhost:${port}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
