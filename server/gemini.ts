import type {
  AnswerFeedback,
  AtsDeepReview,
  ExperienceLevel,
  InterviewQuestion,
  ResumeFormData,
  ResumeOptimization,
  StudyLevel,
  StudyPathMap,
  TopicDetails,
} from '../src/types.js';
import {
  buildFallbackAtsDeepReview,
  buildFallbackQuestions,
  buildFallbackStudyPath,
  buildFallbackTopicDetails,
  buildStructuredResumeFallback,
  ensureCompleteStudyPath,
  ensureExactQuestionCount,
  evaluateAnswerFallback,
} from '../src/utils/fallbackGenerators.js';
import { buildBaselineOptimization } from '../src/utils/resumeHelpers.js';
import {
  aggregateVoiceSessionMetrics,
  buildVoiceSessionReportFallback,
  type SpeechTurnMetrics,
  type VoiceInterviewType,
  type VoiceSessionReport,
} from '../src/utils/voiceMetrics.js';

const Type = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
} as const;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
const BACKUP_MODEL = 'openai/gpt-oss-20b';
const ATTEMPT_TIMEOUT_MS = 30000;

function getGroqApiKey(): string {
  const apiKey = (process.env.GROQ_API_KEY ?? process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured. Please set GROQ_API_KEY in your .env file.'
    );
  }
  return apiKey;
}

function isTransientDemandError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|rate_limit|high demand|overloaded|try again later|fetch failed|ETIMEDOUT|ATTEMPT_TIMEOUT/i.test(
    raw
  );
}

interface GenerateParams {
  model: string;
  contents: string;
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: unknown;
  };
}

async function callGroqChatCompletion(
  apiKey: string,
  params: GenerateParams
): Promise<{ text: string }> {
  const isJson = params.config?.responseMimeType === 'application/json';
  const systemParts: string[] = [];
  if (params.config?.systemInstruction) {
    systemParts.push(params.config.systemInstruction);
  }
  if (isJson) {
    systemParts.push(
      params.config?.responseSchema
        ? `You must respond with valid JSON only (no markdown fences or commentary) matching this JSON schema:\n${JSON.stringify(params.config.responseSchema)}`
        : 'You must respond with valid JSON only (no markdown fences or commentary).'
    );
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemParts.length > 0) {
    messages.push({ role: 'system', content: systemParts.join('\n\n') });
  }
  messages.push({ role: 'user', content: params.contents });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages,
        temperature: 0.4,
        ...(isJson ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Groq API error (${res.status}): ${errorText || res.statusText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    return { text };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('ATTEMPT_TIMEOUT: upstream model timed out under high demand.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes a Groq chat completion call with a per-attempt timeout
 * and automatic failover (`openai/gpt-oss-120b` -> `openai/gpt-oss-20b`)
 * when a model experiences temporary 503 / 429 demand spikes.
 */
async function generateWithRetry(
  buildParams: (model: string) => GenerateParams
): Promise<{ text: string }> {
  const apiKey = getGroqApiKey();
  const models = PRIMARY_MODEL === BACKUP_MODEL ? [PRIMARY_MODEL] : [PRIMARY_MODEL, BACKUP_MODEL];

  let lastError: unknown;
  for (const model of models) {
    try {
      return await callGroqChatCompletion(apiKey, buildParams(model));
    } catch (err) {
      lastError = err;
      if (!isTransientDemandError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

function parseJsonSafe<T>(raw: string | undefined, label: string): T {
  const text = (raw ?? '').trim();
  if (!text) {
    throw new Error(`Empty AI response while generating ${label}.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`Malformed JSON received while generating ${label}.`);
  }
}

export async function generateResumeWithAI(profile: ResumeFormData): Promise<string> {
  const prompt = `Create a polished, ATS-friendly resume in clean Markdown for the following candidate.
Include these exact top-level sections:
# ${profile.name}
Contact line (${[profile.email, profile.phone].filter(Boolean).join(' | ')})
## Professional Summary
## Work Experience
## Technical Skills
## Education
${profile.projects ? '## Projects' : ''}
${profile.certifications ? '## Certifications' : ''}

Candidate Profile:
- Target Role: ${profile.target_role}
- Education: ${profile.education || 'Not specified'}
- Work Experience: ${profile.experience || 'Not specified'}
- Skills: ${profile.skills}
- Projects: ${profile.projects || 'None provided'}
- Certifications: ${profile.certifications || 'None provided'}

Rules:
- Use concise, achievement-oriented bullet points starting with strong action verbs.
- Never fabricate companies, degrees, or metrics not implied by the user's input; refine phrasing cleanly.
- Output ONLY the clean Markdown resume, with no wrapping code fences or commentary.`;

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert technical career coach and ATS resume writer. Produce crisp, scannable single-column Markdown resumes.',
      },
    }));

    const text = (response.text ?? '')
      .trim()
      .replace(/^```(?:markdown)?\n?/i, '')
      .replace(/\n?```$/, '')
      .trim();
    if (!text) {
      return buildStructuredResumeFallback(profile);
    }
    return text;
  } catch (err) {
    if (isTransientDemandError(err)) {
      return buildStructuredResumeFallback(profile);
    }
    throw err;
  }
}

export interface CorrectedResumeResult {
  profile: ResumeFormData;
  resume: string;
  corrections_summary: string[];
}

export async function correctAndStructureResumeWithAI(params: {
  rawResumeText: string;
  targetRole?: string;
  additionalRequirements?: string;
}): Promise<CorrectedResumeResult> {
  const { rawResumeText, targetRole = '', additionalRequirements = '' } = params;

  const fallbackProfile: ResumeFormData = {
    name: 'Candidate',
    email: '',
    phone: '',
    target_role: targetRole || 'Software Engineer',
    education: '',
    experience: rawResumeText.slice(0, 3000),
    skills: '',
    projects: '',
    certifications: '',
  };

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `You are given raw text extracted from a candidate's uploaded resume file.
Your job is two-fold:
1. Extract all relevant candidate details into structured profile fields.
2. Prepare a corrected, polished, ATS-friendly Markdown resume that preserves all relevant details from the uploaded file, fixes grammar/spelling/formatting issues, strengthens weak bullet points with clear action verbs, and incorporates any target role or additional requirements requested by the user.

${targetRole ? `Requested Target Role: ${targetRole}` : 'Target Role: Infer the most suitable role from the resume if not specified.'}
${additionalRequirements ? `User's Additional Requirements / Focus:\n${additionalRequirements}\n` : ''}
Raw Resume Text:
${rawResumeText}

Rules:
- Never fabricate companies, degrees, dates, or metrics that are not present or reasonably implied in the uploaded resume or user's additional requirements.
- Format "resume" in clean Markdown with these exact top-level sections:
  # <Full Name>
  <Email> | <Phone> (include whichever contact details exist)
  ## Professional Summary
  ## Work Experience
  ## Technical Skills
  ## Education
  Include ## Projects and ## Certifications if relevant details exist.
- Provide 3-5 concise bullet points in "corrections_summary" explaining what was corrected or improved.`,
      config: {
        systemInstruction:
          'You are an expert technical career coach and ATS resume editor. Extract structured candidate data accurately and produce crisp, scannable single-column Markdown resumes.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profile: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                target_role: { type: Type.STRING },
                education: { type: Type.STRING },
                experience: { type: Type.STRING },
                skills: { type: Type.STRING },
                projects: { type: Type.STRING },
                certifications: { type: Type.STRING },
              },
              required: [
                'name',
                'email',
                'phone',
                'target_role',
                'education',
                'experience',
                'skills',
                'projects',
                'certifications',
              ],
            },
            resume: {
              type: Type.STRING,
              description: 'Complete corrected ATS-friendly resume in clean Markdown.',
            },
            corrections_summary: {
              type: Type.ARRAY,
              minItems: 2,
              items: { type: Type.STRING },
              description: '3-5 concise notes on what was fixed or improved.',
            },
          },
          required: ['profile', 'resume', 'corrections_summary'],
        },
      },
    }));

    const parsed = parseJsonSafe<Partial<CorrectedResumeResult>>(
      response.text,
      'resume correction'
    );

    const p = parsed.profile ?? ({} as Partial<ResumeFormData>);
    const normalizedProfile: ResumeFormData = {
      name: (p.name ?? '').trim() || fallbackProfile.name,
      email: (p.email ?? '').trim(),
      phone: (p.phone ?? '').trim(),
      target_role: targetRole.trim() || (p.target_role ?? '').trim() || fallbackProfile.target_role,
      education: (p.education ?? '').trim(),
      experience: (p.experience ?? '').trim(),
      skills: (p.skills ?? '').trim(),
      projects: (p.projects ?? '').trim(),
      certifications: (p.certifications ?? '').trim(),
    };

    const cleanedResume = (parsed.resume ?? '')
      .trim()
      .replace(/^```(?:markdown)?\n?/i, '')
      .replace(/\n?```$/, '')
      .trim();

    return {
      profile: normalizedProfile,
      resume: cleanedResume || buildStructuredResumeFallback(normalizedProfile),
      corrections_summary:
        Array.isArray(parsed.corrections_summary) && parsed.corrections_summary.length > 0
          ? parsed.corrections_summary.map((s) => String(s).trim()).filter(Boolean)
          : ['Restructured sections into an ATS-friendly single-column format.'],
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return {
        profile: fallbackProfile,
        resume: buildStructuredResumeFallback(fallbackProfile),
        corrections_summary: [
          'Structured extracted resume content into standard ATS-friendly Markdown sections.',
        ],
      };
    }
    throw err;
  }
}

export async function optimizeResumeWithAI(
  resumeText: string,
  targetRole: string
): Promise<ResumeOptimization> {
  const baseline = buildBaselineOptimization(resumeText, targetRole);
  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Analyze this resume for a "${targetRole}" role and return 8 missing high-value ATS keywords, 10 strong action verbs to use, and 4 concrete improvement recommendations.\n\nResume:\n${resumeText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: {
              type: Type.ARRAY,
              minItems: 5,
              items: { type: Type.STRING },
              description: '6-10 important missing or under-emphasized role keywords.',
            },
            action_verbs: {
              type: Type.ARRAY,
              minItems: 6,
              items: { type: Type.STRING },
              description: '8-12 strong action verbs tailored to the role.',
            },
            improvements: {
              type: Type.ARRAY,
              minItems: 3,
              items: { type: Type.STRING },
              description: '4 concise, actionable resume improvement recommendations.',
            },
          },
          required: ['keywords', 'action_verbs', 'improvements'],
        },
      },
    }));

    const parsed = parseJsonSafe<ResumeOptimization>(response.text, 'resume optimization');
    return {
      keywords:
        parsed.keywords?.length >= 3 ? parsed.keywords : baseline.keywords,
      action_verbs:
        parsed.action_verbs?.length >= 4 ? parsed.action_verbs : baseline.action_verbs,
      improvements:
        parsed.improvements?.length >= 2 ? parsed.improvements : baseline.improvements,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return baseline;
    }
    throw err;
  }
}

export async function deepReviewAtsWithAI(
  resumeText: string,
  jobDescription: string
): Promise<AtsDeepReview> {
  const fallback = buildFallbackAtsDeepReview(resumeText, jobDescription);
  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Conduct a concise recruiter + ATS review of this resume${
        jobDescription ? ' against the provided job description' : ''
      }. Return 3 strengths, 3 gaps, and 3 rewritten bullets.\n\nResume:\n${resumeText}\n\n${jobDescription ? `Job Description:\n${jobDescription}` : ''}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: '2-sentence recruiter verdict.' },
            strengths: {
              type: Type.ARRAY,
              minItems: 3,
              items: { type: Type.STRING },
              description: '3 concrete strengths.',
            },
            gaps: {
              type: Type.ARRAY,
              minItems: 3,
              items: { type: Type.STRING },
              description: '3 specific gaps or ATS risks.',
            },
            rewritten_bullets: {
              type: Type.ARRAY,
              minItems: 2,
              items: { type: Type.STRING },
              description: '2-3 improved example bullet points based on the resume.',
            },
          },
          required: ['summary', 'strengths', 'gaps', 'rewritten_bullets'],
        },
      },
    }));

    const parsed = parseJsonSafe<AtsDeepReview>(response.text, 'ATS deep review');
    return {
      summary: parsed.summary || fallback.summary,
      strengths: parsed.strengths?.length >= 2 ? parsed.strengths : fallback.strengths,
      gaps: parsed.gaps?.length >= 2 ? parsed.gaps : fallback.gaps,
      rewritten_bullets:
        parsed.rewritten_bullets?.length >= 2
          ? parsed.rewritten_bullets
          : fallback.rewritten_bullets,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return fallback;
    }
    throw err;
  }
}

export async function generateInterviewQuestionsWithAI(
  role: string,
  experienceLevel: ExperienceLevel,
  domain: string,
  count: number
): Promise<InterviewQuestion[]> {
  const safeCount = Math.max(1, Math.min(15, Math.floor(count)));

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Generate EXACTLY ${safeCount} distinct, realistic technical and scenario-based interview questions for a ${experienceLevel}-level ${role} specializing in ${domain || role}.
You MUST return a JSON object with a "questions" array containing exactly ${safeCount} separate question objects (do not combine questions; produce ${safeCount} distinct items).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              minItems: safeCount,
              maxItems: safeCount,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  ideal_answer: {
                    type: Type.STRING,
                    description: 'Clear, structured 3-5 sentence model answer.',
                  },
                  key_points: {
                    type: Type.ARRAY,
                    minItems: 2,
                    items: { type: Type.STRING },
                  },
                  evaluation_criteria: {
                    type: Type.ARRAY,
                    minItems: 2,
                    items: { type: Type.STRING },
                  },
                },
                required: ['question', 'ideal_answer', 'key_points', 'evaluation_criteria'],
              },
            },
          },
          required: ['questions'],
        },
      },
    }));

    const parsed = parseJsonSafe<{ questions?: InterviewQuestion[] } | InterviewQuestion[]>(
      response.text,
      'interview questions'
    );
    const list = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    return ensureExactQuestionCount(list, role, experienceLevel, domain, safeCount);
  } catch (err) {
    if (isTransientDemandError(err)) {
      return buildFallbackQuestions(role, experienceLevel, domain, safeCount);
    }
    throw err;
  }
}

export async function evaluateAnswerWithAI(
  question: string,
  userAnswer: string,
  idealAnswer: string
): Promise<AnswerFeedback> {
  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Evaluate this candidate's interview response strictly and constructively.
Question: ${question}
Candidate Answer: ${userAnswer}
Reference Ideal Answer: ${idealAnswer}

Score from 0 to 100 based on technical accuracy, completeness, clarity, and practical depth. Provide 2-3 strengths and 2-3 improvements.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: 'Integer score between 0 and 100.' },
            strengths: {
              type: Type.ARRAY,
              minItems: 2,
              items: { type: Type.STRING },
              description: '2-3 specific things the candidate got right.',
            },
            improvements: {
              type: Type.ARRAY,
              minItems: 2,
              items: { type: Type.STRING },
              description: '2-3 concrete ways to strengthen the answer.',
            },
            detailed_feedback: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence coaching summary.',
            },
          },
          required: ['score', 'strengths', 'improvements', 'detailed_feedback'],
        },
      },
    }));

    const parsed = parseJsonSafe<AnswerFeedback>(response.text, 'answer evaluation');
    const fb = evaluateAnswerFallback(question, userAnswer, idealAnswer);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      strengths: parsed.strengths?.length >= 1 ? parsed.strengths : fb.strengths,
      improvements: parsed.improvements?.length >= 1 ? parsed.improvements : fb.improvements,
      detailed_feedback: parsed.detailed_feedback || fb.detailed_feedback,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return evaluateAnswerFallback(question, userAnswer, idealAnswer);
    }
    throw err;
  }
}

export async function generateStudyPathWithAI(
  role: string,
  level: StudyLevel
): Promise<StudyPathMap> {
  const topicSchema = {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING },
      description: { type: Type.STRING },
      importance: { type: Type.STRING },
      key_points: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
      resources: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
    },
    required: ['topic', 'description', 'importance', 'key_points', 'resources'],
  };

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Create a structured interview preparation study roadmap for a ${role} (primary focus: ${level} level). Organize topics into beginner (3 topics), intermediate (3 topics), and advanced (2 topics) tiers so the candidate has a complete progression path.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            beginner: { type: Type.ARRAY, minItems: 2, items: topicSchema },
            intermediate: { type: Type.ARRAY, minItems: 2, items: topicSchema },
            advanced: { type: Type.ARRAY, minItems: 2, items: topicSchema },
          },
          required: ['beginner', 'intermediate', 'advanced'],
        },
      },
    }));

    const parsed = parseJsonSafe<StudyPathMap>(response.text, 'study path');
    return ensureCompleteStudyPath(parsed, role, level);
  } catch (err) {
    if (isTransientDemandError(err)) {
      return buildFallbackStudyPath(role, level);
    }
    throw err;
  }
}

export async function generateTopicDetailsWithAI(
  topic: string,
  role: string,
  qaContext?: {
    question: string;
    userAnswer?: string;
    idealAnswer?: string;
  }
): Promise<TopicDetails> {
  const fallback = buildFallbackTopicDetails(topic, role);
  const contextPrompt = qaContext
    ? `\n\nThe candidate just answered this interview question and clicked "Know More" to study the underlying concepts:\nQuestion: ${qaContext.question}${
        qaContext.userAnswer ? `\nCandidate's Answer: ${qaContext.userAnswer}` : ''
      }${qaContext.idealAnswer ? `\nReference Ideal Answer: ${qaContext.idealAnswer}` : ''}\n\nTailor the study guide so it directly explains the core concepts behind this question and answer, clarifies why the ideal approach works, and addresses any gaps.`
    : '';

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `Create a focused interview study guide for the topic "${topic}" tailored to a "${role}" candidate. Include an overview, 4 key concepts, 3 practical interview problems, 3 common mistakes candidates make, and 3 well-known documentation/learning resources with valid https URLs.${contextPrompt}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            description: { type: Type.STRING },
            key_concepts: { type: Type.ARRAY, minItems: 3, items: { type: Type.STRING } },
            example_problems: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
            common_mistakes: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
            resources: {
              type: Type.ARRAY,
              minItems: 2,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
                required: ['name', 'type', 'url'],
              },
            },
          },
          required: [
            'topic',
            'description',
            'key_concepts',
            'example_problems',
            'common_mistakes',
            'resources',
          ],
        },
      },
    }));

    const parsed = parseJsonSafe<TopicDetails>(response.text, 'topic details');
    const resources = (parsed.resources ?? []).map((r) => ({
      ...r,
      url: /^https?:\/\//i.test(r.url) ? r.url : 'https://developer.mozilla.org/',
    }));

    return {
      topic: parsed.topic || fallback.topic,
      description: parsed.description || fallback.description,
      key_concepts:
        parsed.key_concepts?.length >= 2 ? parsed.key_concepts : fallback.key_concepts,
      example_problems:
        parsed.example_problems?.length >= 2
          ? parsed.example_problems
          : fallback.example_problems,
      common_mistakes:
        parsed.common_mistakes?.length >= 2
          ? parsed.common_mistakes
          : fallback.common_mistakes,
      resources: resources.length >= 2 ? resources : fallback.resources,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return fallback;
    }
    throw err;
  }
}

export async function generateVoiceOpeningWithAI(
  role: string,
  interviewType: VoiceInterviewType,
  difficulty: ExperienceLevel
): Promise<{ greeting: string; question: string; ideal_answer: string }> {
  const typeLabel =
    interviewType === 'hr'
      ? 'HR and culture fit'
      : interviewType === 'behavioral'
        ? 'behavioral (STAR-method)'
        : 'technical';

  const fallbackGreeting = `Welcome! I'm your ${role} interviewer today. We'll walk through a ${difficulty}-level ${interviewType.toUpperCase()} conversation. Take a breath, speak naturally, and let's begin.`;
  const fallbackQ =
    interviewType === 'behavioral'
      ? `Tell me about a challenging project or disagreement you navigated as a ${role}, and what measurable result came out of your actions.`
      : interviewType === 'hr'
        ? `Walk me through your background and what motivates you to take on a ${difficulty}-level ${role} role right now.`
        : `Describe a technical bottleneck or architecture decision you handled recently as a ${role}. Why did you choose that approach?`;
  const fallbackIdeal = `Deliver a concise, well-structured spoken response for a ${difficulty}-level ${role} covering context, concrete decisions or actions, and measurable outcomes.`;

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `You are conducting a live spoken ${typeLabel} mock interview for a ${difficulty}-level ${role}.
Generate:
1. A warm, natural 2-sentence spoken greeting introducing the session.
2. Question 1 (clear, conversational, easy to understand when spoken aloud).
3. A 3-sentence reference ideal answer.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            question: { type: Type.STRING },
            ideal_answer: { type: Type.STRING },
          },
          required: ['greeting', 'question', 'ideal_answer'],
        },
      },
    }));

    const parsed = parseJsonSafe<{
      greeting?: string;
      question?: string;
      ideal_answer?: string;
    }>(response.text, 'voice interview opening');

    return {
      greeting: parsed.greeting?.trim() || fallbackGreeting,
      question: parsed.question?.trim() || fallbackQ,
      ideal_answer: parsed.ideal_answer?.trim() || fallbackIdeal,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return {
        greeting: fallbackGreeting,
        question: fallbackQ,
        ideal_answer: fallbackIdeal,
      };
    }
    throw err;
  }
}

export async function generateNextVoiceTurnWithAI(params: {
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: ExperienceLevel;
  previousQuestion: string;
  userAnswer: string;
  turnIndex: number;
  targetQuestions: number;
  askedQuestions: string[];
}): Promise<{
  interviewerAck: string;
  question: string;
  ideal_answer: string;
  isFollowUp: boolean;
}> {
  const shouldFollowUp = params.turnIndex % 2 === 0 && params.userAnswer.trim().length > 15;
  const fallbackAck = 'Thank you for walking through that.';
  const fallbackQuestion = shouldFollowUp
    ? `Following up on your point, what specific trade-off or unexpected challenge did you run into there, and how would you handle it differently today?`
    : buildFallbackQuestions(params.role, params.difficulty, params.interviewType, 1)[0]?.question ??
      `How do you measure success and maintain quality in your day-to-day work as a ${params.role}?`;
  const fallbackIdeal =
    'Reference concrete metrics, highlight the key decision criteria or STAR action, and explain what you learned.';

  try {
    const response = await generateWithRetry((model) => ({
      model,
      contents: `You are conducting a live spoken ${params.interviewType} mock interview for a ${params.difficulty}-level ${params.role} (question ${params.turnIndex + 2} of ${params.targetQuestions}).
Previous question: ${params.previousQuestion}
Candidate's spoken answer: ${params.userAnswer}
Questions already asked: ${params.askedQuestions.join(' | ')}

Respond naturally like a real interviewer:
1. Give a brief 1-sentence spoken acknowledgment of what the candidate just said (without revealing final scores yet).
2. Ask ONE natural ${shouldFollowUp ? 'follow-up question probing deeper into their last answer' : 'new interview question on a fresh topic not yet covered'}.
3. Provide a 3-sentence reference ideal answer.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interviewerAck: { type: Type.STRING },
            question: { type: Type.STRING },
            ideal_answer: { type: Type.STRING },
            isFollowUp: { type: Type.BOOLEAN },
          },
          required: ['interviewerAck', 'question', 'ideal_answer', 'isFollowUp'],
        },
      },
    }));

    const parsed = parseJsonSafe<{
      interviewerAck?: string;
      question?: string;
      ideal_answer?: string;
      isFollowUp?: boolean;
    }>(response.text, 'next voice turn');

    return {
      interviewerAck: parsed.interviewerAck?.trim() || fallbackAck,
      question: parsed.question?.trim() || fallbackQuestion,
      ideal_answer: parsed.ideal_answer?.trim() || fallbackIdeal,
      isFollowUp: typeof parsed.isFollowUp === 'boolean' ? parsed.isFollowUp : shouldFollowUp,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return {
        interviewerAck: fallbackAck,
        question: fallbackQuestion,
        ideal_answer: fallbackIdeal,
        isFollowUp: shouldFollowUp,
      };
    }
    throw err;
  }
}

export async function analyzeVoiceInterviewWithAI(params: {
  sessionId: string;
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: ExperienceLevel;
  createdAt: string;
  completedAt: string;
  durationSeconds: number;
  turns: Array<{
    question: string;
    isFollowUp: boolean;
    idealAnswer: string;
    userAnswer: string;
    metrics: SpeechTurnMetrics;
  }>;
}): Promise<VoiceSessionReport> {
  const fallback = buildVoiceSessionReportFallback(params);
  const agg = aggregateVoiceSessionMetrics(params.turns.map((t) => t.metrics));

  try {
    const transcriptSummary = params.turns
      .map(
        (t, i) =>
          `Turn ${i + 1} (${t.isFollowUp ? 'Follow-up' : 'Core'}):\nQ: ${t.question}\nCandidate spoken answer: ${t.userAnswer}\nMeasured metrics: ${t.metrics.wpm} WPM, ${t.metrics.fillerCount} fillers, ${t.metrics.pauseCount} pauses (avg ${t.metrics.avgPauseSeconds}s), volume steadiness ${t.metrics.volumeSteadiness}/100.`
      )
      .join('\n\n');

    const response = await generateWithRetry((model) => ({
      model,
      contents: `Analyze this complete spoken ${params.interviewType} mock interview for a ${params.difficulty}-level ${params.role}.
Measured overall speech metrics: ${agg.wpm} WPM, ${agg.fillerCount} filler words, avg pause ${agg.avgPauseSeconds}s, vocal steadiness ${agg.volumeSteadiness}/100.

Interview Transcript:
${transcriptSummary}

Return a detailed JSON evaluation scoring confidence, answeringAbility, communicationSkills, and englishKnowledge out of 100, plus grammar corrections, better phrasing suggestions, strengths, weaknesses, question-by-question feedback with sample better answers, actionable tips, and a personalized 3-step practice plan.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidenceScore: { type: Type.INTEGER },
            confidenceLabel: { type: Type.STRING, description: 'Low, Medium, or High' },
            confidenceNotes: { type: Type.STRING },
            answeringScore: { type: Type.INTEGER },
            relevance: { type: Type.INTEGER },
            structureClarity: { type: Type.INTEGER },
            depthAccuracy: { type: Type.INTEGER },
            completeness: { type: Type.INTEGER },
            answeringNotes: { type: Type.STRING },
            communicationScore: { type: Type.INTEGER },
            clarityFluency: { type: Type.INTEGER },
            toneProfessionalism: { type: Type.INTEGER },
            conciseness: { type: Type.INTEGER },
            communicationNotes: { type: Type.STRING },
            englishScore: { type: Type.INTEGER },
            vocabularyRange: { type: Type.INTEGER },
            sentenceFormation: { type: Type.INTEGER },
            englishNotes: { type: Type.STRING },
            grammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  corrected: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['original', 'corrected', 'reason'],
              },
            },
            betterPhrasings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  improved: { type: Type.STRING },
                },
                required: ['original', 'improved'],
              },
            },
            strengths: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, minItems: 2, items: { type: Type.STRING } },
            questionFeedback: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  sampleBetterAnswer: { type: Type.STRING },
                  keyTakeaway: { type: Type.STRING },
                },
                required: ['question', 'score', 'sampleBetterAnswer', 'keyTakeaway'],
              },
            },
            actionableTips: { type: Type.ARRAY, minItems: 3, items: { type: Type.STRING } },
            practicePlan: { type: Type.ARRAY, minItems: 3, items: { type: Type.STRING } },
          },
          required: [
            'confidenceScore',
            'confidenceLabel',
            'confidenceNotes',
            'answeringScore',
            'relevance',
            'structureClarity',
            'depthAccuracy',
            'completeness',
            'answeringNotes',
            'communicationScore',
            'clarityFluency',
            'toneProfessionalism',
            'conciseness',
            'communicationNotes',
            'englishScore',
            'vocabularyRange',
            'sentenceFormation',
            'englishNotes',
            'grammarCorrections',
            'betterPhrasings',
            'strengths',
            'weaknesses',
            'questionFeedback',
            'actionableTips',
            'practicePlan',
          ],
        },
      },
    }));

    const parsed = parseJsonSafe<{
      confidenceScore: number;
      confidenceLabel: string;
      confidenceNotes: string;
      answeringScore: number;
      relevance: number;
      structureClarity: number;
      depthAccuracy: number;
      completeness: number;
      answeringNotes: string;
      communicationScore: number;
      clarityFluency: number;
      toneProfessionalism: number;
      conciseness: number;
      communicationNotes: string;
      englishScore: number;
      vocabularyRange: number;
      sentenceFormation: number;
      englishNotes: string;
      grammarCorrections: Array<{ original: string; corrected: string; reason: string }>;
      betterPhrasings: Array<{ original: string; improved: string }>;
      strengths: string[];
      weaknesses: string[];
      questionFeedback: Array<{
        question: string;
        score: number;
        sampleBetterAnswer: string;
        keyTakeaway: string;
      }>;
      actionableTips: string[];
      practicePlan: string[];
    }>(response.text, 'voice session analysis');

    const clamp = (n: number, fb: number) =>
      Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fb;

    const confScore = clamp(parsed.confidenceScore, fallback.confidence.score);
    const ansScore = clamp(parsed.answeringScore, fallback.answeringAbility.score);
    const commScore = clamp(parsed.communicationScore, fallback.communicationSkills.score);
    const engScore = clamp(parsed.englishScore, fallback.englishKnowledge.score);

    const normalizedLabel =
      parsed.confidenceLabel === 'Low' ||
      parsed.confidenceLabel === 'Medium' ||
      parsed.confidenceLabel === 'High'
        ? parsed.confidenceLabel
        : confScore >= 78
          ? 'High'
          : confScore >= 58
            ? 'Medium'
            : 'Low';

    const mergedQuestionFeedback = params.turns.map((turn, idx) => {
      const aiItem = parsed.questionFeedback?.[idx];
      const fbItem = fallback.questionFeedback[idx];
      return {
        question: turn.question,
        isFollowUp: turn.isFollowUp,
        userAnswer: turn.userAnswer || '(No spoken response recorded)',
        sampleBetterAnswer:
          aiItem?.sampleBetterAnswer?.trim() || fbItem?.sampleBetterAnswer || turn.idealAnswer,
        score: clamp(aiItem?.score ?? NaN, fbItem?.score ?? 70),
        keyTakeaway: aiItem?.keyTakeaway?.trim() || fbItem?.keyTakeaway || 'Keep answers concise.',
      };
    });

    return {
      ...fallback,
      overallScore: Math.round((confScore + ansScore + commScore + engScore) / 4),
      confidence: {
        ...fallback.confidence,
        score: confScore,
        label: normalizedLabel,
        notes: parsed.confidenceNotes?.trim() || fallback.confidence.notes,
      },
      answeringAbility: {
        score: ansScore,
        relevance: clamp(parsed.relevance, fallback.answeringAbility.relevance),
        structureClarity: clamp(parsed.structureClarity, fallback.answeringAbility.structureClarity),
        depthAccuracy: clamp(parsed.depthAccuracy, fallback.answeringAbility.depthAccuracy),
        completeness: clamp(parsed.completeness, fallback.answeringAbility.completeness),
        notes: parsed.answeringNotes?.trim() || fallback.answeringAbility.notes,
      },
      communicationSkills: {
        score: commScore,
        clarityFluency: clamp(parsed.clarityFluency, fallback.communicationSkills.clarityFluency),
        toneProfessionalism: clamp(
          parsed.toneProfessionalism,
          fallback.communicationSkills.toneProfessionalism
        ),
        conciseness: clamp(parsed.conciseness, fallback.communicationSkills.conciseness),
        notes: parsed.communicationNotes?.trim() || fallback.communicationSkills.notes,
      },
      englishKnowledge: {
        score: engScore,
        vocabularyRange: clamp(parsed.vocabularyRange, fallback.englishKnowledge.vocabularyRange),
        sentenceFormation: clamp(
          parsed.sentenceFormation,
          fallback.englishKnowledge.sentenceFormation
        ),
        grammarCorrections:
          parsed.grammarCorrections?.length > 0
            ? parsed.grammarCorrections
            : fallback.englishKnowledge.grammarCorrections,
        betterPhrasings:
          parsed.betterPhrasings?.length > 0
            ? parsed.betterPhrasings
            : fallback.englishKnowledge.betterPhrasings,
        notes: parsed.englishNotes?.trim() || fallback.englishKnowledge.notes,
      },
      strengths: parsed.strengths?.length >= 1 ? parsed.strengths : fallback.strengths,
      weaknesses: parsed.weaknesses?.length >= 1 ? parsed.weaknesses : fallback.weaknesses,
      questionFeedback: mergedQuestionFeedback,
      actionableTips:
        parsed.actionableTips?.length >= 2 ? parsed.actionableTips : fallback.actionableTips,
      practicePlan:
        parsed.practicePlan?.length >= 2 ? parsed.practicePlan : fallback.practicePlan,
    };
  } catch (err) {
    if (isTransientDemandError(err)) {
      return fallback;
    }
    throw err;
  }
}

