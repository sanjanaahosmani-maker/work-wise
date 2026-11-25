import {
  Award,
  CheckCircle2,
  Download,
  FileText,
  Lightbulb,
  Mic,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationSeconds } from '../utils/resumeHelpers';
import type { VoiceSessionReport } from '../utils/voiceMetrics';

interface VoiceReportDashboardProps {
  report: VoiceSessionReport;
  history: VoiceSessionReport[];
  recordedAudioUrl?: string | null;
  onStartNewSession: () => void;
}

export function VoiceReportDashboard({
  report,
  history,
  recordedAudioUrl,
  onStartNewSession,
}: VoiceReportDashboardProps) {
  const chartData = history.map((item, idx) => ({
    session: `Session ${idx + 1}`,
    confidence: item.confidence.score,
    communication: item.communicationSkills.score,
    english: item.englishKnowledge.score,
  }));

  const confidenceColor =
    report.confidence.label === 'High'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : report.confidence.label === 'Medium'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-red-700 bg-red-50 border-red-200';

  const handleDownloadReport = () => {
    const lines = [
      'IntervYou — Voice Assistant Mock Interview Report',
      `Role: ${report.role} (${report.difficulty})`,
      `Interview Type: ${report.interviewType.toUpperCase()}`,
      `Duration: ${formatDurationSeconds(report.durationSeconds)}`,
      `Overall Score: ${report.overallScore}/100`,
      '',
      `[Confidence Level] ${report.confidence.score}/100 (${report.confidence.label})`,
      `  Pace: ${report.confidence.wpm} WPM | Filler Words: ${report.confidence.fillerCount} | Avg Pause: ${report.confidence.avgPauseSeconds}s | Steadiness: ${report.confidence.volumeSteadiness}/100`,
      `  Notes: ${report.confidence.notes}`,
      '',
      `[Answering Ability] ${report.answeringAbility.score}/100`,
      `  Relevance: ${report.answeringAbility.relevance} | Structure/Clarity: ${report.answeringAbility.structureClarity} | Depth: ${report.answeringAbility.depthAccuracy} | Completeness: ${report.answeringAbility.completeness}`,
      `  Notes: ${report.answeringAbility.notes}`,
      '',
      `[Communication Skills] ${report.communicationSkills.score}/100`,
      `  Clarity/Fluency: ${report.communicationSkills.clarityFluency} | Tone: ${report.communicationSkills.toneProfessionalism} | Conciseness: ${report.communicationSkills.conciseness}`,
      `  Notes: ${report.communicationSkills.notes}`,
      '',
      `[English Knowledge] ${report.englishKnowledge.score}/100`,
      `  Vocabulary: ${report.englishKnowledge.vocabularyRange} | Sentence Formation: ${report.englishKnowledge.sentenceFormation}`,
      `  Notes: ${report.englishKnowledge.notes}`,
      '',
      'Strengths:',
      ...report.strengths.map((s) => `- ${s}`),
      '',
      'Areas to Improve:',
      ...report.weaknesses.map((w) => `- ${w}`),
      '',
      'Actionable Tips:',
      ...report.actionableTips.map((t) => `- ${t}`),
      '',
      'Personalized Practice Plan:',
      ...report.practicePlan.map((p, i) => `${i + 1}. ${p}`),
      '',
      'Question-by-Question Review:',
      ...report.questionFeedback.flatMap((q, i) => [
        `${i + 1}. ${q.question} (${q.score}/100)${q.isFollowUp ? ' [Follow-up]' : ''}`,
        `   Your Answer: ${q.userAnswer}`,
        `   Sample Better Answer: ${q.sampleBetterAnswer}`,
        `   Key Takeaway: ${q.keyTakeaway}`,
        '',
      ]),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-assistant-report-${report.role.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Mic className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Voice Assistant Evaluation Report
              </h2>
              <p className="text-xs text-slate-500">
                {report.role} · {report.interviewType.toUpperCase()} · {report.difficulty} ·{' '}
                {formatDurationSeconds(report.durationSeconds)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              onClick={onStartNewSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              New Voice Session
            </button>
          </div>
        </div>

        {/* 4 Category Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">Confidence Level</p>
              <span className={`px-2 py-0.5 text-[11px] font-semibold border rounded ${confidenceColor}`}>
                {report.confidence.label}
              </span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {report.confidence.score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
              {report.confidence.wpm} WPM · {report.confidence.fillerCount} fillers ·{' '}
              {report.confidence.volumeSteadiness}% steady
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">Answering Ability</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {report.answeringAbility.score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Relevance {report.answeringAbility.relevance} · Structure{' '}
              {report.answeringAbility.structureClarity}
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">Communication Skills</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {report.communicationSkills.score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Fluency {report.communicationSkills.clarityFluency} · Tone{' '}
              {report.communicationSkills.toneProfessionalism}
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">English Knowledge</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {report.englishKnowledge.score}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Vocab {report.englishKnowledge.vocabularyRange} · Grammar{' '}
              {report.englishKnowledge.sentenceFormation}
            </p>
          </div>
        </div>

        {/* Speech Metrics & Opt-in Audio Playback */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
          <div>
            <p className="text-slate-500">Overall Score</p>
            <p className="mt-1 text-base font-bold font-mono tabular-nums text-indigo-700">
              {report.overallScore}/100
            </p>
          </div>
          <div>
            <p className="text-slate-500">Speaking Pace</p>
            <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900">
              {report.confidence.wpm} WPM
            </p>
          </div>
          <div>
            <p className="text-slate-500">Avg Pause Length</p>
            <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900">
              {report.confidence.avgPauseSeconds}s
            </p>
          </div>
          <div>
            <p className="text-slate-500">Top Filler Words</p>
            <p className="mt-1 text-sm font-medium text-slate-900 truncate">
              {report.confidence.fillerBreakdown.length > 0
                ? report.confidence.fillerBreakdown
                    .slice(0, 3)
                    .map((f) => `"${f.word}" (${f.count})`)
                    .join(', ')
                : 'None detected'}
            </p>
          </div>
        </div>

        {recordedAudioUrl && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-700">
              Opt-in Local Session Audio Playback (not stored on server)
            </span>
            <audio controls src={recordedAudioUrl} className="h-8 max-w-full" />
          </div>
        )}
      </section>

      {/* Progress Tracking Across Saved Sessions */}
      {chartData.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Progress Across Voice Sessions
                </h3>
                <p className="text-xs text-slate-500">
                  Confidence, communication, and English scores saved to session history
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600" aria-hidden="true" />
                Confidence
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-sky-500" aria-hidden="true" />
                Communication
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                English
              </span>
            </div>
          </div>

          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="session"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  name="Confidence"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="communication"
                  name="Communication"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="english"
                  name="English"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Strengths, Weaknesses, Tips & Practice Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">Strengths &amp; Gaps</h3>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1.5">Key Strengths</p>
            <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
              {report.strengths.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">Areas to Strengthen</p>
            <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
              {report.weaknesses.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900">
              Actionable Tips &amp; Practice Plan
            </h3>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Immediate Coaching Tips</p>
            <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
              {report.actionableTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-indigo-700 mb-1.5">
              Next Sessions Practice Plan
            </p>
            <ol className="space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
              {report.practicePlan.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* English Grammar Corrections & Better Phrasing */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900">
            English Fluency, Grammar &amp; Phrasing Suggestions
          </h3>
        </div>
        <p className="text-sm text-slate-600">{report.englishKnowledge.notes}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700">Grammar &amp; Clarity Fixes</h4>
            {report.englishKnowledge.grammarCorrections.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-1">
                <p className="text-slate-500 line-through">{item.original}</p>
                <p className="font-medium text-emerald-700">{item.corrected}</p>
                <p className="text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700">Stronger Phrasing Upgrades</h4>
            {report.englishKnowledge.betterPhrasings.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-1">
                <p className="text-slate-500">Instead of: &ldquo;{item.original}&rdquo;</p>
                <p className="font-medium text-indigo-700 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Try: &ldquo;{item.improved}&rdquo;</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Question-by-Question Review */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Question-by-Question Feedback</h3>
        <div className="space-y-4">
          {report.questionFeedback.map((item, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Question {idx + 1} · {item.isFollowUp ? 'AI Follow-Up' : 'Core Prompt'}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{item.question}</h4>
                </div>
                <span className="font-mono tabular-nums text-sm font-bold text-indigo-700 shrink-0">
                  {item.score}/100
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                <div className="bg-slate-50 rounded-lg p-3.5 space-y-1">
                  <p className="font-semibold text-slate-700">Your Spoken Answer</p>
                  <p className="text-slate-600 leading-relaxed">{item.userAnswer}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 space-y-1">
                  <p className="font-semibold text-indigo-800">Sample Better Answer</p>
                  <p className="text-slate-700 leading-relaxed">{item.sampleBetterAnswer}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Key Takeaway:</span>{' '}
                {item.keyTakeaway}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
