import { useState, type FormEvent } from 'react';
import { Eye, Loader2, MessageSquareText, Send, X } from 'lucide-react';
import { AVAILABLE_ROLES, CURATED_QUESTIONS, EXPERIENCE_LEVELS } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type { AnswerFeedback, ExperienceLevel, InterviewQuestion } from '../types';
import { buildFallbackQuestions } from '../utils/fallbackGenerators';

interface InterviewQaPageProps {
  onQuestionPracticed: () => void;
}

export function InterviewQaPage({ onQuestionPracticed }: InterviewQaPageProps) {
  const [role, setRole] = useState('Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('mid');
  const [domain, setDomain] = useState('');
  const [countText, setCountText] = useState('5');

  const [questions, setQuestions] = useState<InterviewQuestion[]>(
    CURATED_QUESTIONS['Frontend Developer'].mid
  );
  const [sourceLabel, setSourceLabel] = useState('Curated Practice Set · Frontend Developer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showIdeal, setShowIdeal] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [modalError, setModalError] = useState('');

  const activeQuestion = activeIndex !== null ? questions[activeIndex] ?? null : null;

  const getValidCount = () => {
    const parsed = Number.parseInt(countText, 10);
    if (!Number.isFinite(parsed)) return 5;
    return Math.max(1, Math.min(15, parsed));
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
      setQuestions(res.questions);
      setSourceLabel(`AI Generated · ${role} · ${experienceLevel}`);
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
    setQuestions(bank);
    setSourceLabel(`Curated Practice Set · ${role || 'Frontend Developer'} · ${experienceLevel}`);
    setError('');
  };

  const openQuestionModal = (idx: number) => {
    setActiveIndex(idx);
    setUserAnswer('');
    setShowIdeal(false);
    setFeedback(null);
    setModalError('');
  };

  const closeQuestionModal = () => {
    setActiveIndex(null);
    setModalError('');
  };

  const handleEvaluate = async () => {
    if (!activeQuestion) return;
    if (!userAnswer.trim()) {
      setModalError('Enter your answer before submitting for evaluation.');
      return;
    }

    setModalError('');
    setEvaluating(true);
    try {
      const res = await apiRequest<{ success: boolean; feedback: AnswerFeedback }>(
        '/interview/evaluate',
        {
          method: 'POST',
          body: JSON.stringify({
            question: activeQuestion.question,
            user_answer: userAnswer,
            ideal_answer: activeQuestion.ideal_answer,
          }),
        }
      );
      setFeedback(res.feedback);
      onQuestionPracticed();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to evaluate answer.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Interview Q&amp;A</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate role-specific interview questions, rehearse your answers, and receive structured scoring.
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
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

        {/* Questions List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">{sourceLabel}</p>
            <p className="text-xs font-mono tabular-nums text-slate-500">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </p>
          </div>

          {questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={`${q.question.slice(0, 24)}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs font-mono tabular-nums text-slate-400">
                        Question {String(idx + 1).padStart(2, '0')}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900 leading-snug">
                        {q.question}
                      </h3>
                      {q.key_points.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Key focus: {q.key_points.join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openQuestionModal(idx)}
                      className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Practice Answer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-4">
                <MessageSquareText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                No questions loaded yet
              </h2>
              <p className="text-sm text-slate-500">
                Select your target role on the left and click Generate AI Questions to start practicing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Practice Modal */}
      {activeQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qa-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 id="qa-modal-title" className="text-base font-semibold text-slate-900">
                Practice Question {(activeIndex ?? 0) + 1}
              </h2>
              <button
                type="button"
                onClick={closeQuestionModal}
                aria-label="Close question practice modal"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Interview Prompt</p>
                <p className="text-base font-semibold text-slate-900 leading-relaxed">
                  {activeQuestion.question}
                </p>
              </div>

              {modalError && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
                >
                  {modalError}
                </div>
              )}

              <div>
                <label
                  htmlFor="qa-user-answer"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Your Answer
                </label>
                <textarea
                  id="qa-user-answer"
                  rows={5}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Structure your explanation clearly with trade-offs and concrete examples..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {showIdeal && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-indigo-700">Ideal Answer</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activeQuestion.ideal_answer}
                  </p>
                  {activeQuestion.evaluation_criteria.length > 0 && (
                    <p className="text-xs text-slate-500 pt-1">
                      Evaluated on: {activeQuestion.evaluation_criteria.join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {feedback && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Evaluation Feedback</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-indigo-700">
                      {feedback.score}/100
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {feedback.detailed_feedback}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <p className="font-semibold text-emerald-700 mb-1">Strengths</p>
                      <ul className="space-y-1 text-slate-700 list-disc pl-4">
                        {feedback.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 mb-1">Areas to Improve</p>
                      <ul className="space-y-1 text-slate-700 list-disc pl-4">
                        {feedback.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowIdeal((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {showIdeal ? 'Hide Ideal Answer' : 'Show Ideal Answer'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeQuestionModal}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={evaluating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Submit Answer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
