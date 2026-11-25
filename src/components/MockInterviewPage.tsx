import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Loader2,
  MessageSquareText,
  Mic,
  Play,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AVAILABLE_ROLES, EXPERIENCE_LEVELS } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type {
  ExperienceLevel,
  InterviewQuestion,
  MockFeedbackEntry,
  MockSessionSummary,
} from '../types';
import { formatDurationSeconds } from '../utils/resumeHelpers';
import { VoiceAssistantMode } from './VoiceAssistantMode';

interface MockInterviewPageProps {
  onSessionCompleted: (averageScore: number, questionsAnswered: number) => void;
}

type MockMode = 'text' | 'voice';
type MockPhase = 'setup' | 'active' | 'results';

export function MockInterviewPage({ onSessionCompleted }: MockInterviewPageProps) {
  const [mode, setMode] = useState<MockMode>('text');
  // Setup state
  const [role, setRole] = useState('Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('mid');
  const [domain, setDomain] = useState('');
  const [numQuestionsText, setNumQuestionsText] = useState('3');

  // Active session state
  const [phase, setPhase] = useState<MockPhase>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showIdeal, setShowIdeal] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<MockFeedbackEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Results state
  const [summary, setSummary] = useState<MockSessionSummary | null>(null);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (phase !== 'active') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const getValidCount = () => {
    const parsed = Number.parseInt(numQuestionsText, 10);
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(1, Math.min(10, parsed));
  };

  const handleStart = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Please select a target role to start your mock interview.');
      return;
    }

    const requestedCount = getValidCount();
    setNumQuestionsText(String(requestedCount));
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        session_id: string;
        total_questions: number;
        current_question: InterviewQuestion;
        current_question_index: number;
      }>('/mock-interview/start', {
        method: 'POST',
        body: JSON.stringify({
          role,
          experience_level: experienceLevel,
          domain: domain.trim() || role,
          num_questions: requestedCount,
        }),
      });

      setSessionId(res.session_id);
      setTotalQuestions(res.total_questions);
      setCurrentQuestion(res.current_question);
      setCurrentIndex(res.current_question_index);
      setAnswer('');
      setShowIdeal(false);
      setLastFeedback(null);
      setElapsedSeconds(0);
      setSummary(null);
      setPhase('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start mock interview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId) return;
    if (!answer.trim()) {
      setError('Please type your answer before continuing.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const nextRes = await apiRequest<{
        success: boolean;
        completed: boolean;
        current_question?: InterviewQuestion;
        current_question_index?: number;
        total_questions: number;
        previous_feedback?: MockFeedbackEntry;
      }>(`/mock-interview/${encodeURIComponent(sessionId)}/next`, {
        method: 'POST',
        body: JSON.stringify({ response: answer }),
      });

      if (nextRes.previous_feedback) {
        setLastFeedback(nextRes.previous_feedback);
      }

      if (nextRes.completed) {
        const completeRes = await apiRequest<MockSessionSummary & { success: boolean }>(
          `/mock-interview/${encodeURIComponent(sessionId)}/complete`,
          { method: 'POST' }
        );
        setSummary(completeRes);
        setPhase('results');
        onSessionCompleted(completeRes.average_score, completeRes.responses_count);
      } else {
        setCurrentQuestion(nextRes.current_question ?? null);
        setCurrentIndex(nextRes.current_question_index ?? currentIndex + 1);
        setAnswer('');
        setShowIdeal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!summary) return;
    const lines = [
      `IntervYou — Mock Interview Report`,
      `Role: ${summary.role} (${summary.experience_level})`,
      `Average Score: ${summary.average_score}%`,
      `Questions Answered: ${summary.responses_count}/${summary.total_questions}`,
      `Duration: ${formatDurationSeconds(elapsedSeconds)}`,
      '',
      ...summary.feedback.flatMap((entry, idx) => [
        `--- Question ${idx + 1} (${entry.feedback.score}/100) ---`,
        `Q: ${entry.question}`,
        `Your Answer: ${entry.user_answer}`,
        `Feedback: ${entry.feedback.detailed_feedback}`,
        `Strengths: ${entry.feedback.strengths.join('; ')}`,
        `Improvements: ${entry.feedback.improvements.join('; ')}`,
        `Ideal Answer: ${entry.ideal_answer}`,
        '',
      ]),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock-interview-${summary.role.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleReturnToSetup = () => {
    setPhase('setup');
    setSessionId(null);
    setCurrentQuestion(null);
    setSummary(null);
    setLastFeedback(null);
    setError('');
  };

  const progressPct =
    totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mock Interview</h1>
        <p className="text-sm text-slate-600 mt-1">
          Rehearse a timed multi-question interview via typed responses or the spoken Voice Assistant.
        </p>
      </div>

      {/* Mode Switcher: Text Interview vs Voice Assistant */}
      <div
        role="tablist"
        aria-label="Mock interview mode"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl"
      >
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          role="tab"
          aria-selected={mode === 'text'}
          onClick={() => setMode('text')}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all card-elevated ${
            mode === 'text'
              ? 'border-teal-600 bg-teal-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-teal-300'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              mode === 'text' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Text Interview</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Written Q&amp;A session with timed tracking and rubric scoring
            </p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          role="tab"
          aria-selected={mode === 'voice'}
          onClick={() => setMode('voice')}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all card-elevated ${
            mode === 'voice'
              ? 'border-teal-600 bg-teal-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-teal-300'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              mode === 'voice' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Voice Assistant</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Spoken AI interviewer with live speech detection, follow-ups &amp; fluency score
            </p>
          </div>
        </motion.button>
      </div>

      {mode === 'voice' ? (
        <VoiceAssistantMode onSessionCompleted={onSessionCompleted} />
      ) : (
        <>
          {/* PHASE 1: SETUP */}
          {phase === 'setup' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl card-elevated p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200 mb-5">
            Configure Interview Session
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-4 px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleStart} noValidate className="space-y-4">
            <div>
              <label htmlFor="mock-role" className="block text-xs font-medium text-slate-700 mb-1">
                Target Role *
              </label>
              <select
                id="mock-role"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mock-level"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Experience Level
                </label>
                <select
                  id="mock-level"
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
                <label
                  htmlFor="mock-count"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Questions
                </label>
                <input
                  id="mock-count"
                  type="number"
                  min={1}
                  max={10}
                  value={numQuestionsText}
                  onChange={(e) => setNumQuestionsText(e.target.value)}
                  onBlur={() => setNumQuestionsText(String(getValidCount()))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mock-domain" className="block text-xs font-medium text-slate-700 mb-1">
                Domain / Industry (Optional)
              </label>
              <input
                id="mock-domain"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., FinTech, SaaS, Cloud Infrastructure"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Preparing Interview Questions...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Start Interview
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* PHASE 2: ACTIVE INTERVIEW */}
      {phase === 'active' && currentQuestion && (
        <div className="max-w-3xl space-y-5">
          {/* Progress Header */}
          <div className="bg-white border border-slate-200 rounded-xl card-elevated p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-medium text-slate-900">
                Question{' '}
                <span className="font-mono tabular-nums">{currentIndex + 1}</span> of{' '}
                <span className="font-mono tabular-nums">{totalQuestions}</span>
                <span className="text-slate-400 mx-2">·</span>
                <span className="text-slate-600">{role}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {formatDurationSeconds(elapsedSeconds)}
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {lastFeedback && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 text-sm">
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">Previous answer scored:</span>{' '}
                {lastFeedback.feedback.detailed_feedback}
              </p>
              <span className="font-mono tabular-nums font-bold text-teal-700 shrink-0">
                {lastFeedback.feedback.score}/100
              </span>
            </div>
          )}

          {/* Question & Answer Card */}
          <div className="bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                {currentQuestion.question}
              </h2>
            </div>

            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="mock-answer"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Your Answer
              </label>
              <textarea
                id="mock-answer"
                rows={6}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your response here. Cover architecture, trade-offs, and concrete examples..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {showIdeal && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                <p className="text-xs font-semibold text-teal-700">Ideal Answer Reference</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {currentQuestion.ideal_answer}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowIdeal((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {showIdeal ? 'Hide Ideal Answer' : 'Show Ideal Answer'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReturnToSetup}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel Session
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Evaluating...
                    </>
                  ) : currentIndex + 1 >= totalQuestions ? (
                    'Submit & Finish'
                  ) : (
                    'Submit & Next'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: RESULTS SUMMARY */}
      {phase === 'results' && summary && (
        <div className="max-w-3xl space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Interview Complete</h2>
                  <p className="text-xs text-slate-500">
                    {summary.role} · {summary.experience_level} level
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download Report
                </button>
                <button
                  type="button"
                  onClick={handleReturnToSetup}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Start New Interview
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Total Questions</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {summary.total_questions}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Average Score</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-700">
                  {summary.average_score}%
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {formatDurationSeconds(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Question-by-Question Review</h3>
              {summary.feedback.map((entry, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {entry.question}
                    </h4>
                    <span className="font-mono tabular-nums text-sm font-bold text-teal-700 shrink-0">
                      {entry.feedback.score}/100
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {entry.feedback.detailed_feedback}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <p className="font-semibold text-emerald-700 mb-1">Strengths</p>
                      <ul className="space-y-1 text-slate-600 list-disc pl-4">
                        {entry.feedback.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 mb-1">Improvements</p>
                      <ul className="space-y-1 text-slate-600 list-disc pl-4">
                        {entry.feedback.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
        </>
      )}
    </div>
  );
}
