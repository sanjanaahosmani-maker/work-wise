import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquareText,
  Send,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AVAILABLE_ROLES, CURATED_QUESTIONS, EXPERIENCE_LEVELS } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type {
  AnswerFeedback,
  ExperienceLevel,
  InterviewQuestion,
  StudyConceptRedirectPayload,
} from '../types';
import { buildFallbackQuestions } from '../utils/fallbackGenerators';

interface InterviewQaPageProps {
  onQuestionPracticed: () => void;
  onKnowMore: (payload: StudyConceptRedirectPayload) => void;
}

const EXAM_STATE_STORAGE_KEY = 'workwise_interview_qa_exam_v1';

interface PersistedExamState {
  role: string;
  experienceLevel: ExperienceLevel;
  domain: string;
  countText: string;
  questions: InterviewQuestion[];
  sourceLabel: string;
  currentIndex: number;
  answers: Record<number, string>;
  feedbackMap: Record<number, AnswerFeedback>;
}

function loadPersistedExamState(): PersistedExamState | null {
  try {
    const raw = sessionStorage.getItem(EXAM_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedExamState>;
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }
    return {
      role: parsed.role || 'Frontend Developer',
      experienceLevel: parsed.experienceLevel || 'mid',
      domain: parsed.domain || '',
      countText: parsed.countText || String(parsed.questions.length),
      questions: parsed.questions,
      sourceLabel: parsed.sourceLabel || 'Practice Exam',
      currentIndex:
        typeof parsed.currentIndex === 'number'
          ? Math.max(0, Math.min(parsed.questions.length - 1, parsed.currentIndex))
          : 0,
      answers: parsed.answers ?? {},
      feedbackMap: parsed.feedbackMap ?? {},
    };
  } catch {
    return null;
  }
}

export function InterviewQaPage({ onQuestionPracticed, onKnowMore }: InterviewQaPageProps) {
  const [initial] = useState<PersistedExamState | null>(() => loadPersistedExamState());

  const [role, setRole] = useState(initial?.role ?? 'Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initial?.experienceLevel ?? 'mid'
  );
  const [domain, setDomain] = useState(initial?.domain ?? '');
  const [countText, setCountText] = useState(initial?.countText ?? '5');

  const [questions, setQuestions] = useState<InterviewQuestion[]>(
    initial?.questions ?? CURATED_QUESTIONS['Frontend Developer'].mid
  );
  const [sourceLabel, setSourceLabel] = useState(
    initial?.sourceLabel ?? 'Curated Practice Set · Frontend Developer'
  );
  const [currentIndex, setCurrentIndex] = useState(initial?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<number, string>>(initial?.answers ?? {});
  const [feedbackMap, setFeedbackMap] = useState<Record<number, AnswerFeedback>>(
    initial?.feedbackMap ?? {}
  );
  const [showIdealMap, setShowIdealMap] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [examError, setExamError] = useState('');

  useEffect(() => {
    try {
      const payload: PersistedExamState = {
        role,
        experienceLevel,
        domain,
        countText,
        questions,
        sourceLabel,
        currentIndex,
        answers,
        feedbackMap,
      };
      sessionStorage.setItem(EXAM_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues
    }
  }, [role, experienceLevel, domain, countText, questions, sourceLabel, currentIndex, answers, feedbackMap]);

  const currentQuestion = questions[currentIndex] ?? null;
  const currentAnswer = answers[currentIndex] ?? '';
  const currentFeedback = feedbackMap[currentIndex] ?? null;
  const showIdeal = Boolean(showIdealMap[currentIndex]);
  const answeredCount = Object.keys(feedbackMap).length;
  const progressPercent =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const getValidCount = () => {
    const parsed = Number.parseInt(countText, 10);
    if (!Number.isFinite(parsed)) return 5;
    return Math.max(1, Math.min(15, parsed));
  };

  const resetExamProgress = (nextQuestions: InterviewQuestion[], nextLabel: string) => {
    setQuestions(nextQuestions);
    setSourceLabel(nextLabel);
    setCurrentIndex(0);
    setAnswers({});
    setFeedbackMap({});
    setShowIdealMap({});
    setExamError('');
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!role) {
      setError('Please select a target role.');
      return;
    }

    const requestedCount = getValidCount();
    setCountText(String(requestedCount));
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        questions: InterviewQuestion[];
      }>('/interview/questions', {
        method: 'POST',
        body: JSON.stringify({
          role,
          experience_level: experienceLevel,
          domain: domain.trim() || role,
          count: requestedCount,
        }),
      });
      resetExamProgress(res.questions, `AI Exam · ${role} · ${experienceLevel}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCurated = () => {
    const requestedCount = getValidCount();
    setCountText(String(requestedCount));
    const bank = buildFallbackQuestions(
      role || 'Frontend Developer',
      experienceLevel,
      domain.trim() || role || 'Frontend Developer',
      requestedCount
    );
    resetExamProgress(
      bank,
      `Curated Exam · ${role || 'Frontend Developer'} · ${experienceLevel}`
    );
    setError('');
  };

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: value }));
    if (examError) setExamError('');
  };

  const handleEvaluate = async () => {
    if (!currentQuestion) return;
    if (!currentAnswer.trim()) {
      setExamError('Enter your answer before submitting for evaluation.');
      return;
    }

    setExamError('');
    setEvaluating(true);
    try {
      const res = await apiRequest<{ success: boolean; feedback: AnswerFeedback }>(
        '/interview/evaluate',
        {
          method: 'POST',
          body: JSON.stringify({
            question: currentQuestion.question,
            user_answer: currentAnswer,
            ideal_answer: currentQuestion.ideal_answer,
          }),
        }
      );
      setFeedbackMap((prev) => ({ ...prev, [currentIndex]: res.feedback }));
      onQuestionPracticed();
    } catch (err) {
      setExamError(err instanceof Error ? err.message : 'Failed to evaluate answer.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleGoToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
    setExamError('');
  };

  const handleKnowMore = () => {
    if (!currentQuestion) return;
    onKnowMore({
      role: role || 'Software Engineer',
      question: currentQuestion.question,
      userAnswer: currentAnswer,
      idealAnswer: currentQuestion.ideal_answer,
      keyPoints: currentQuestion.key_points,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Interview Q&amp;A</h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure your question settings, answer each question in exam mode, get instant evaluation, and dive deeper into any concept.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Configuration Sidebar */}
        <form
          onSubmit={handleGenerate}
          noValidate
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
            Question Configuration
          </h2>

          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="qa-role" className="block text-xs font-medium text-slate-700 mb-1">
              Target Role *
            </label>
            <select
              id="qa-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            >
              <option value="">Select a role...</option>
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qa-level" className="block text-xs font-medium text-slate-700 mb-1">
              Experience Level
            </label>
            <select
              id="qa-level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {EXPERIENCE_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qa-domain" className="block text-xs font-medium text-slate-700 mb-1">
              Domain / Focus Area
            </label>
            <input
              id="qa-domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., Web Performance, Distributed Systems"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label htmlFor="qa-count" className="block text-xs font-medium text-slate-700 mb-1">
              Number of Questions (1-15)
            </label>
            <input
              id="qa-count"
              type="number"
              min={1}
              max={15}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              onBlur={() => setCountText(String(getValidCount()))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating Questions...
                </>
              ) : (
                'Generate AI Questions'
              )}
            </button>
            <button
              type="button"
              onClick={handleLoadCurated}
              className="w-full py-2 px-4 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Load Curated Question Bank
            </button>
          </div>
        </form>

        {/* Exam Mode Panel */}
        <div className="lg:col-span-8 space-y-4">
          {currentQuestion ? (
            <>
              {/* Exam Progress Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 card-elevated">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{sourceLabel}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      Question {currentIndex + 1} of {questions.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono tabular-nums text-slate-600">
                      Answered: {answeredCount}/{questions.length} ({progressPercent}%)
                    </p>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-[#0D9488]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {questions.map((_, idx) => {
                    const isCurrent = idx === currentIndex;
                    const isAnswered = Boolean(feedbackMap[idx]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleGoToQuestion(idx)}
                        aria-label={`Go to question ${idx + 1}`}
                        className={`h-7 min-w-7 px-2 text-xs font-mono font-semibold rounded-md transition-colors ${
                          isCurrent
                            ? 'bg-teal-600 text-white shadow-xs'
                            : isAnswered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Exam Question Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden card-elevated"
                >
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                        {currentQuestion.question}
                      </h2>
                      {currentFeedback && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0 pt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Answered · {currentFeedback.score}/100
                        </span>
                      )}
                    </div>
                    {currentQuestion.key_points.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Key focus: {currentQuestion.key_points.join(' · ')}
                      </p>
                    )}
                  </div>

                  {examError && (
                    <div
                      role="alert"
                      className="px-3.5 py-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
                    >
                      {examError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="qa-exam-answer"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Your Answer
                    </label>
                    <textarea
                      id="qa-exam-answer"
                      rows={5}
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Write your answer in exam style—cover architecture, trade-offs, and concrete examples..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {showIdeal && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2"
                    >
                      <p className="text-xs font-semibold text-teal-700">Ideal Answer</p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {currentQuestion.ideal_answer}
                      </p>
                      {currentQuestion.evaluation_criteria.length > 0 && (
                        <p className="text-xs text-slate-500 pt-1">
                          Evaluated on: {currentQuestion.evaluation_criteria.join(' · ')}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {currentFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">Evaluation Feedback</p>
                        <p className="text-lg font-bold font-mono tabular-nums text-teal-700">
                          {currentFeedback.score}/100
                        </p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {currentFeedback.detailed_feedback}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                        <div>
                          <p className="font-semibold text-emerald-700 mb-1">Strengths</p>
                          <ul className="space-y-1 text-slate-700 list-disc pl-4">
                            {currentFeedback.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-amber-700 mb-1">Areas to Improve</p>
                          <ul className="space-y-1 text-slate-700 list-disc pl-4">
                            {currentFeedback.improvements.map((imp, i) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={handleKnowMore}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          Know More
                        </motion.button>
                        {currentIndex < questions.length - 1 && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => handleGoToQuestion(currentIndex + 1)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Next Question
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() =>
                      setShowIdealMap((prev) => ({
                        ...prev,
                        [currentIndex]: !prev[currentIndex],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {showIdeal ? 'Hide Ideal Answer' : 'Show Ideal Answer'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGoToQuestion(currentIndex - 1)}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 rounded-lg"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={evaluating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {evaluating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          {currentFeedback ? 'Re-submit Answer' : 'Submit Answer'}
                        </>
                      )}
                    </button>
                    {currentIndex < questions.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleGoToQuestion(currentIndex + 1)}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Next Question
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-4">
                <MessageSquareText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                No questions loaded yet
              </h2>
              <p className="text-sm text-slate-500">
                Select your target role on the left and click Generate AI Questions to start your exam.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
