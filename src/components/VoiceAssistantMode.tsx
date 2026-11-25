import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Clock,
  History,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Square,
  Volume2,
} from 'lucide-react';
import { AVAILABLE_ROLES, EXPERIENCE_LEVELS } from '../data/catalog';
import { useVoiceEngine } from '../hooks/useVoiceEngine';
import { apiRequest } from '../lib/api';
import type { ExperienceLevel } from '../types';
import { formatDurationSeconds } from '../utils/resumeHelpers';
import {
  type SpeechTurnMetrics,
  type VoiceInterviewType,
  type VoiceSessionReport,
} from '../utils/voiceMetrics';
import { VoiceReportDashboard } from './VoiceReportDashboard';

interface VoiceAssistantModeProps {
  onSessionCompleted: (averageScore: number, questionsAnswered: number) => void;
}

type VoicePhase = 'setup' | 'active' | 'report';

const INTERVIEW_TYPES: Array<{ value: VoiceInterviewType; label: string; hint: string }> = [
  { value: 'technical', label: 'Technical', hint: 'Architecture, coding & system trade-offs' },
  { value: 'behavioral', label: 'Behavioral', hint: 'STAR stories, ownership & teamwork' },
  { value: 'hr', label: 'HR Screening', hint: 'Background, motivation & culture fit' },
];

export function VoiceAssistantMode({ onSessionCompleted }: VoiceAssistantModeProps) {
  // Configuration
  const [role, setRole] = useState('Frontend Developer');
  const [interviewType, setInterviewType] = useState<VoiceInterviewType>('technical');
  const [difficulty, setDifficulty] = useState<ExperienceLevel>('mid');
  const [targetQuestionsText, setTargetQuestionsText] = useState('5');
  const [consentGranted, setConsentGranted] = useState(false);
  const [saveRawAudio, setSaveRawAudio] = useState(false);

  // Active interview state
  const [phase, setPhase] = useState<VoicePhase>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewerMessage, setInterviewerMessage] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [targetQuestions, setTargetQuestions] = useState(5);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualDraft, setManualDraft] = useState('');

  // History & report state
  const [report, setReport] = useState<VoiceSessionReport | null>(null);
  const [history, setHistory] = useState<VoiceSessionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sessionIdRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  useEffect(() => {
    sessionIdRef.current = sessionId;
    elapsedRef.current = elapsedSeconds;
  }, [sessionId, elapsedSeconds]);

  // Load saved SQLite history on mount
  useEffect(() => {
    apiRequest<{ success: boolean; history: VoiceSessionReport[] }>('/voice-interview/history')
      .then((res) => {
        if (Array.isArray(res.history)) {
          setHistory(res.history);
        }
      })
      .catch(() => {
        // Non-blocking on initial mount
      });
  }, []);

  // Elapsed timer during active session
  useEffect(() => {
    if (phase !== 'active') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const finishAndScoreSession = useCallback(
    async (sid: string) => {
      setLoading(true);
      setError('');
      try {
        const res = await apiRequest<{
          success: boolean;
          report: VoiceSessionReport;
          history: VoiceSessionReport[];
        }>(`/voice-interview/${encodeURIComponent(sid)}/complete`, {
          method: 'POST',
          body: JSON.stringify({ duration_seconds: Math.max(1, elapsedRef.current) }),
        });
        setReport(res.report);
        if (Array.isArray(res.history)) {
          setHistory(res.history);
        }
        setPhase('report');
        onSessionCompleted(res.report.overallScore, res.report.questionFeedback.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate voice session report.');
      } finally {
        setLoading(false);
      }
    },
    [onSessionCompleted]
  );

  const engineSubmitRef = useRef<
    (transcript: string, metrics: SpeechTurnMetrics, hasAudio: boolean) => Promise<void>
  >(async () => {});

  const voice = useVoiceEngine({
    pauseThresholdMs: 1800,
    saveRawAudio,
    onAutoSubmit: (transcript, metrics, hasAudio) => {
      void engineSubmitRef.current(transcript, metrics, hasAudio);
    },
    onNoSpeech: () => {
      // Prompt handled in voice.voiceError ("I didn't catch that, please repeat.")
    },
  });

  const handleTurnSubmit = useCallback(
    async (
      transcript: string,
      metrics?: SpeechTurnMetrics,
      options?: { skipped?: boolean; endEarly?: boolean; hasAudio?: boolean }
    ) => {
      const sid = sessionIdRef.current;
      if (!sid) return;

      const cleanText = transcript.trim();
      if (!options?.skipped && !cleanText) {
        voice.setVoiceError("I didn't catch that, please repeat or type your answer below.");
        return;
      }

      voice.stopSpeaking();
      voice.stopAudioPipeline();
      voice.setEngineState('processing');
      setLoading(true);
      setError('');

      try {
        const turnMetrics = metrics ?? voice.buildCurrentMetrics(cleanText);
        const res = await apiRequest<{
          success: boolean;
          completed: boolean;
          interviewer_ack?: string;
          current_question?: string;
          is_follow_up?: boolean;
          turn_index: number;
          target_questions: number;
        }>(`/voice-interview/${encodeURIComponent(sid)}/next`, {
          method: 'POST',
          body: JSON.stringify({
            transcript: cleanText,
            metrics: turnMetrics,
            skipped: Boolean(options?.skipped),
            end_early: Boolean(options?.endEarly),
            has_audio: Boolean(options?.hasAudio),
          }),
        });

        voice.resetTranscript();
        setManualDraft('');

        if (res.completed) {
          voice.setEngineState('idle');
          await finishAndScoreSession(sid);
          return;
        }

        const ack = res.interviewer_ack || '';
        const nextQ = res.current_question || '';
        setInterviewerMessage(ack);
        setCurrentQuestion(nextQ);
        setIsFollowUp(Boolean(res.is_follow_up));
        setTurnIndex(res.turn_index);
        setLoading(false);

        const spokenTurn = ack ? `${ack} ${nextQ}` : nextQ;
        voice.speakText(spokenTurn, () => {
          void voice.startListening();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error submitting your answer.');
        voice.setEngineState('idle');
        setLoading(false);
      }
    },
    [finishAndScoreSession, voice]
  );

  useEffect(() => {
    engineSubmitRef.current = async (transcript, metrics, hasAudio) => {
      await handleTurnSubmit(transcript, metrics, { hasAudio });
    };
  }, [handleTurnSubmit]);

  const getValidCount = () => {
    const parsed = Number.parseInt(targetQuestionsText, 10);
    if (!Number.isFinite(parsed)) return 5;
    return Math.max(5, Math.min(10, parsed));
  };

  const handleStartVoiceSession = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!consentGranted) {
      setError('Please confirm microphone consent before starting the Voice Assistant.');
      return;
    }

    const requestedCount = getValidCount();
    setTargetQuestionsText(String(requestedCount));
    setLoading(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        session_id: string;
        greeting: string;
        current_question: string;
        is_follow_up: boolean;
        turn_index: number;
        target_questions: number;
      }>('/voice-interview/start', {
        method: 'POST',
        body: JSON.stringify({
          role,
          interview_type: interviewType,
          difficulty,
          target_questions: requestedCount,
          consent_granted: true,
          save_raw_audio: saveRawAudio,
        }),
      });

      setSessionId(res.session_id);
      sessionIdRef.current = res.session_id;
      setInterviewerMessage(res.greeting);
      setCurrentQuestion(res.current_question);
      setIsFollowUp(Boolean(res.is_follow_up));
      setTurnIndex(res.turn_index);
      setTargetQuestions(res.target_questions);
      setElapsedSeconds(0);
      setReport(null);
      voice.resetTranscript();
      setManualDraft('');
      setPhase('active');
      setLoading(false);

      const spokenIntro = `${res.greeting} Question 1: ${res.current_question}`;
      voice.speakText(spokenIntro, () => {
        void voice.startListening();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Voice Assistant session.');
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (voice.engineState === 'listening') {
      const liveText = (
        `${voice.finalTranscript} ${voice.interimTranscript}`.trim() || manualDraft.trim()
      );
      if (liveText) {
        void handleTurnSubmit(liveText, undefined, { hasAudio: saveRawAudio });
      } else {
        voice.stopAudioPipeline();
        voice.setEngineState('idle');
      }
    } else if (voice.engineState === 'speaking') {
      voice.stopSpeaking();
      void voice.startListening();
    } else if (voice.engineState === 'idle') {
      void voice.startListening();
    }
  };

  const handleRepeatQuestion = () => {
    if (!currentQuestion) return;
    voice.speakText(currentQuestion, () => {
      void voice.startListening();
    });
  };

  const handleSkipQuestion = () => {
    void handleTurnSubmit('[Skipped question]', undefined, { skipped: true });
  };

  const handleEndSessionNow = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const liveText = (
      `${voice.finalTranscript} ${voice.interimTranscript}`.trim() || manualDraft.trim()
    );
    voice.stopSpeaking();
    voice.stopAudioPipeline();
    if (liveText) {
      await handleTurnSubmit(liveText, undefined, { endEarly: true, hasAudio: saveRawAudio });
    } else {
      await finishAndScoreSession(sid);
    }
  };

  const handleResetToSetup = () => {
    voice.stopSpeaking();
    voice.stopAudioPipeline();
    voice.resetTranscript();
    setPhase('setup');
    setSessionId(null);
    setReport(null);
    setError('');
  };

  const stateLabelMap: Record<typeof voice.engineState, string> = {
    idle: 'Idle',
    listening: voice.isPaused ? 'Paused' : 'Listening',
    processing: 'Processing',
    speaking: 'Speaking',
  };

  const combinedLiveTranscript = `${voice.finalTranscript} ${voice.interimTranscript}`.trim();
  const progressPct =
    targetQuestions > 0 ? Math.round(((turnIndex + 1) / targetQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* PHASE 1: SETUP + SESSION HISTORY */}
      {phase === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleStartVoiceSession}
            noValidate
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Mic className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Voice Assistant Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  Spoken AI interviewer with live transcription, follow-ups, and vocal analysis
                </p>
              </div>
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
              <span className="block text-xs font-medium text-slate-700 mb-2">
                Interview Type *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {INTERVIEW_TYPES.map((item) => {
                  const selected = interviewType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setInterviewType(item.value)}
                      aria-pressed={selected}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selected
                          ? 'border-teal-600 bg-teal-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          selected ? 'text-teal-700' : 'text-slate-900'
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label
                  htmlFor="voice-role"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Role *
                </label>
                <select
                  id="voice-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="voice-difficulty"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Difficulty Level
                </label>
                <select
                  id="voice-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as ExperienceLevel)}
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
                  htmlFor="voice-count"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Questions
                </label>
                <input
                  id="voice-count"
                  type="number"
                  min={5}
                  max={10}
                  value={targetQuestionsText}
                  onChange={(e) => setTargetQuestionsText(e.target.value)}
                  onBlur={() => setTargetQuestionsText(String(getValidCount()))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            {/* Privacy & Consent Controls */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-800">
                Microphone Permission &amp; Privacy Consent
              </p>
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  id="voice-consent"
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span>
                  I consent to live microphone listening for speech-to-text transcription during this
                  mock interview. Transcripts and scores are saved for progress tracking; raw audio
                  is never uploaded or stored on the server.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  id="voice-raw-audio-optin"
                  type="checkbox"
                  checked={saveRawAudio}
                  onChange={(e) => setSaveRawAudio(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span>
                  Optional: Keep temporary local audio playback in my browser for self-review after
                  the session.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Starting Voice Assistant...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Start Voice Assistant
                </>
              )}
            </button>
          </form>

          {/* Past Saved Sessions Column */}
          <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-teal-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">Saved Voice Sessions</h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {history.length} saved
              </span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed py-4">
                Complete your first Voice Assistant session to store transcripts, confidence metrics,
                and score trends in the database.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {[...history].reverse().map((item) => (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() => {
                      setReport(item);
                      setPhase('report');
                    }}
                    className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {item.role} · {item.interviewType.toUpperCase()}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-bold text-teal-700 shrink-0">
                        {item.overallScore}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Confidence: {item.confidence.label} ({item.confidence.score}) · Comm:{' '}
                      {item.communicationSkills.score} · English: {item.englishKnowledge.score}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* PHASE 2: ACTIVE SPOKEN SESSION */}
      {phase === 'active' && (
        <div className="max-w-4xl space-y-5">
          {/* Progress Header */}
          <div className="bg-white border border-slate-200 rounded-xl card-elevated p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Mic className="h-4 w-4 text-teal-600" aria-hidden="true" />
                <span>Voice Assistant</span>
                <span className="text-slate-300">·</span>
                <span>
                  Question <span className="font-mono tabular-nums">{turnIndex + 1}</span> of{' '}
                  <span className="font-mono tabular-nums">{targetQuestions}</span>
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 capitalize">{interviewType}</span>
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

          {(error || voice.voiceError) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 px-4 py-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error || voice.voiceError}</span>
            </div>
          )}

          {/* Interviewer Prompt & Persistent Mic HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5">
              {interviewerMessage && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">Interviewer:</span>{' '}
                  {interviewerMessage}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-teal-600 mb-1">
                  {isFollowUp ? 'Natural Follow-Up Question' : 'Interview Question'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                  {currentQuestion}
                </h2>
              </div>

              {/* Live Spoken Transcript */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Live Transcript</span>
                  <span className="text-slate-500">
                    Auto-submits after ~1.8s pause in speech
                  </span>
                </div>
                <div
                  aria-live="polite"
                  className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 leading-relaxed"
                >
                  {combinedLiveTranscript ? (
                    <>
                      <span>{voice.finalTranscript}</span>
                      {voice.interimTranscript && (
                        <span className="text-slate-400"> {voice.interimTranscript}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">
                      {voice.engineState === 'speaking'
                        ? 'Interviewer is speaking the question...'
                        : voice.engineState === 'listening'
                          ? 'Listening for your spoken answer...'
                          : 'Click the microphone button or type your response below.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Manual Fallback / Edit Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label
                  htmlFor="voice-manual-answer"
                  className="block text-xs font-medium text-slate-600"
                >
                  Typed Response Fallback (optional if mic is blocked or muted)
                </label>
                <div className="flex gap-2">
                  <input
                    id="voice-manual-answer"
                    type="text"
                    value={manualDraft}
                    onChange={(e) => setManualDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualDraft.trim() && !loading) {
                        e.preventDefault();
                        void handleTurnSubmit(manualDraft, undefined, { hasAudio: false });
                      }
                    }}
                    placeholder="Type an answer if microphone is unavailable..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    disabled={loading || (!manualDraft.trim() && !combinedLiveTranscript)}
                    onClick={() =>
                      void handleTurnSubmit(
                        combinedLiveTranscript || manualDraft,
                        undefined,
                        { hasAudio: saveRawAudio }
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Submit Answer
                  </button>
                </div>
              </div>
            </div>

            {/* Persistent Microphone Control & Live Waveform Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl card-elevated p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Voice Status</span>
                <span className="font-mono text-xs font-semibold text-teal-700">
                  {stateLabelMap[voice.engineState]}
                </span>
              </div>

              {/* Persistent Mic Button with Pulse Ring */}
              <div className="flex flex-col items-center py-3 space-y-4">
                <div className="relative flex items-center justify-center">
                  {voice.engineState === 'listening' && !voice.isPaused && (
                    <span
                      className="absolute h-24 w-24 rounded-full bg-teal-400/25 animate-ping"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleMicToggle}
                    disabled={loading || voice.engineState === 'processing'}
                    aria-label={
                      voice.engineState === 'listening'
                        ? 'Finish speaking and submit answer'
                        : 'Start listening with microphone'
                    }
                    className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-sm transition-all disabled:opacity-60 ${
                      voice.engineState === 'listening'
                        ? 'bg-red-600 hover:bg-red-700'
                        : voice.engineState === 'speaking'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {voice.engineState === 'processing' || loading ? (
                      <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                    ) : voice.engineState === 'speaking' ? (
                      <Volume2 className="h-7 w-7" aria-hidden="true" />
                    ) : voice.micPermission === 'denied' ? (
                      <MicOff className="h-7 w-7" aria-hidden="true" />
                    ) : (
                      <Mic className="h-7 w-7" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Live Audio Waveform Bars */}
                <div
                  aria-label="Live voice waveform"
                  className="flex items-center justify-center gap-1 h-12 w-full px-2"
                >
                  {voice.waveform.map((lvl, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        voice.engineState === 'listening' && !voice.isPaused
                          ? 'bg-teal-600'
                          : voice.engineState === 'speaking'
                            ? 'bg-amber-500'
                            : 'bg-slate-200'
                      }`}
                      style={{
                        height: `${Math.round(Math.max(15, lvl * 100))}%`,
                      }}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  {voice.engineState === 'listening'
                    ? 'Speak clearly — click mic or pause ~1.8s when finished.'
                    : voice.engineState === 'speaking'
                      ? 'Click mic to interrupt and answer immediately.'
                      : 'Click the mic button to start or resume speaking.'}
                </p>
              </div>

              {/* Session Controls */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={voice.togglePause}
                  disabled={voice.engineState !== 'listening'}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {voice.isPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      Resume Mic
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                      Pause Mic
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRepeatQuestion}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Repeat Question
                </button>

                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                  Skip Question
                </button>

                <button
                  type="button"
                  onClick={handleEndSessionNow}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  End &amp; Score
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3: EVALUATION REPORT & MULTI-SESSION PROGRESS */}
      {phase === 'report' && report && (
        <VoiceReportDashboard
          report={report}
          history={history}
          recordedAudioUrl={voice.recordedAudioUrl}
          onStartNewSession={handleResetToSetup}
        />
      )}
    </div>
  );
}
