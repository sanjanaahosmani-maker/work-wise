export type WorkspaceView =
  | 'overview'
  | 'resume-builder'
  | 'ats-checker'
  | 'interview-qa'
  | 'study-concepts'
  | 'mock-interview'
  | 'fake-job-detection'
  | 'profile';

export type ExperienceLevel = 'junior' | 'mid' | 'senior';
export type StudyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface UserProfileDetails {
  name: string;
  headline: string;
  targetRole: string;
  location: string;
  bio: string;
  photoDataUrl: string;
}

export interface ResumeFormData {
  name: string;
  email: string;
  phone: string;
  target_role: string;
  education: string;
  experience: string;
  skills: string;
  projects: string;
  certifications: string;
}

export interface ResumeOptimization {
  keywords: string[];
  action_verbs: string[];
  improvements: string[];
}

export interface AtsAnalysisResult {
  score: number;
  keyword_match: number | null;
  matched_keywords: string[];
  missing_keywords: string[];
  recommendations: string[];
  section_checks: {
    experience: boolean;
    education: boolean;
    skills: boolean;
    projects: boolean;
    email: boolean;
    phone: boolean;
  };
}

export interface AtsDeepReview {
  summary: string;
  strengths: string[];
  gaps: string[];
  rewritten_bullets: string[];
}

export interface InterviewQuestion {
  id?: string;
  question: string;
  ideal_answer: string;
  key_points: string[];
  evaluation_criteria: string[];
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  detailed_feedback: string;
}

export interface StudyTopic {
  topic: string;
  description: string;
  importance: string;
  key_points: string[];
  resources: string[];
}

export type StudyPathMap = {
  beginner?: StudyTopic[];
  intermediate?: StudyTopic[];
  advanced?: StudyTopic[];
  [key: string]: StudyTopic[] | undefined;
};

export interface TopicResource {
  name: string;
  type: string;
  url: string;
}

export interface TopicDetails {
  topic: string;
  description: string;
  key_concepts: string[];
  example_problems: string[];
  common_mistakes: string[];
  resources: TopicResource[];
}

export interface MockFeedbackEntry {
  question: string;
  user_answer: string;
  ideal_answer: string;
  feedback: AnswerFeedback;
}

export interface MockSessionSummary {
  session_id: string;
  role: string;
  experience_level: ExperienceLevel;
  domain: string;
  total_questions: number;
  responses_count: number;
  average_score: number;
  feedback: MockFeedbackEntry[];
  created_at: string;
  completed_at: string;
}

export interface WorkspaceStats {
  resumesBuilt: number;
  atsChecksRun: number;
  questionsPracticed: number;
  topicsStudied: string[];
  mockSessionsCompleted: number;
  lastAtsScore: number | null;
  lastMockScore: number | null;
}

export interface StudyConceptRedirectPayload {
  role: string;
  question: string;
  userAnswer: string;
  idealAnswer: string;
  keyPoints?: string[];
}
