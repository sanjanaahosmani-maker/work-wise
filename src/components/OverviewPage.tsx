import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  MessageSquareText,
  ShieldAlert,
  Video,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WorkspaceStats, WorkspaceView } from '../types';
import { buildPracticeTrendSeries } from '../utils/practiceTrends';

interface OverviewPageProps {
  stats: WorkspaceStats;
  onNavigate: (view: WorkspaceView) => void;
}

const SUITE_MODULES: {
  id: WorkspaceView;
  title: string;
  meta: string;
  description: string;
  cta: string;
  icon: typeof FileText;
}[] = [
  {
    id: 'resume-builder',
    title: 'Resume Builder',
    meta: 'AI Generation · Optimization Tips',
    description:
      'Turn your experience, skills, and projects into a clean, single-column ATS-friendly resume tailored to your target role.',
    cta: 'Open Resume Builder',
    icon: FileText,
  },
  {
    id: 'ats-checker',
    title: 'ATS Checker',
    meta: 'Keyword Match · Structural Audit',
    description:
      'Score your resume against a job description to uncover missing keywords, missing sections, and high-impact bullet improvements.',
    cta: 'Analyze Resume',
    icon: CheckSquare,
  },
  {
    id: 'interview-qa',
    title: 'Interview Q&A',
    meta: '12 Roles · Graded Answers',
    description:
      'Practice role-specific technical and scenario questions with model answers, key points, and constructive scoring.',
    cta: 'Practice Questions',
    icon: MessageSquareText,
  },
  {
    id: 'study-concepts',
    title: 'Study Concepts',
    meta: 'Beginner to Advanced · Deep Dives',
    description:
      'Follow structured learning paths organized by difficulty with core concepts, example problems, and common pitfalls.',
    cta: 'Browse Study Path',
    icon: BookOpen,
  },
  {
    id: 'mock-interview',
    title: 'Mock Interview',
    meta: 'Timed Session · Final Report',
    description:
      'Simulate a multi-question interview session with real-time progress tracking, answer evaluation, and a downloadable summary report.',
    cta: 'Start Mock Session',
    icon: Video,
  },
  {
    id: 'fake-job-detection',
    title: 'Fake Job Detection',
    meta: 'Scam Signals · Listing Audit',
    description:
      'Inspect suspicious job listings, recruiter emails, and compensation offers for red flags and verification cues.',
    cta: 'Inspect Job Listing',
    icon: ShieldAlert,
  },
];

export function OverviewPage({ stats, onNavigate }: OverviewPageProps) {
  const trendData = buildPracticeTrendSeries(
    stats.questionsPracticed,
    stats.mockSessionsCompleted
  );

  return (
    <div className="space-y-8">
      {/* Primary Hero Anchor */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-indigo-600 mb-2">
            AI Interview Prep Suite
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4"
            style={{ textWrap: 'balance' }}
          >
            Prepare for your next technical interview in one focused workspace
          </h1>
          <p className="text-base text-slate-600 leading-relaxed mb-6 max-w-2xl">
            Build an ATS-ready resume, verify keyword alignment against real job descriptions,
            rehearse role-specific questions, master core study topics, and complete timed mock
            interviews with instant rubric feedback.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('resume-builder')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Build Resume
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('mock-interview')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Start Mock Interview
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Readiness Metrics Row */}
      <section aria-label="Preparation summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Latest ATS Score</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.lastAtsScore !== null ? `${stats.lastAtsScore}/100` : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {stats.atsChecksRun} {stats.atsChecksRun === 1 ? 'check' : 'checks'} completed
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Questions Practiced</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.questionsPracticed}
            </p>
            <p className="mt-1 text-xs text-slate-500">Evaluated across Q&amp;A &amp; mocks</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Topics Mastered</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.topicsStudied.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Tracked in Study Concepts</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Latest Mock Score</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900">
              {stats.lastMockScore !== null ? `${stats.lastMockScore}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {stats.mockSessionsCompleted}{' '}
              {stats.mockSessionsCompleted === 1 ? 'session' : 'sessions'} finished
            </p>
          </div>
        </div>
      </section>

      {/* Practice Activity Trends Chart */}
      <section
        aria-labelledby="practice-trends-heading"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="practice-trends-heading" className="text-base font-semibold text-slate-900">
              Practice Activity Trends
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly questions practiced and mock interview sessions completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600 shrink-0" aria-hidden="true" />
              Questions Practiced
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-sky-500 shrink-0" aria-hidden="true" />
              Mock Sessions Completed
            </span>
          </div>
        </div>

        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData}
              barGap={6}
              margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                }}
              />
              <Bar
                dataKey="questionsPracticed"
                name="Questions Practiced"
                fill="#4F46E5"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
              />
              <Bar
                dataKey="mockSessionsCompleted"
                name="Mock Sessions Completed"
                fill="#0EA5E9"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Suite Modules Grid */}
      <section aria-labelledby="suite-modules-heading">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="suite-modules-heading" className="text-lg font-semibold text-slate-900">
            Preparation Tools
          </h2>
          <p className="text-xs text-slate-500">6 integrated modules · 12 engineering &amp; product roles</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SUITE_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-indigo-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs text-slate-500">{mod.meta}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{mod.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{mod.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(mod.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors self-start"
                >
                  <span>{mod.cta}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
