import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  FileText,
  MessageSquareText,
  ShieldAlert,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
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
    meta: 'File & LinkedIn · AI Edit',
    description:
      'Draft from scratch, import any resume file, or pull LinkedIn details into a clean single-column ATS resume.',
    cta: 'Open Resume Builder',
    icon: FileText,
  },
  {
    id: 'ats-checker',
    title: 'ATS Checker',
    meta: 'Keyword Match · Audit',
    description:
      'Score your resume against a job description to uncover missing keywords, structural risks, and bullet rewrites.',
    cta: 'Analyze Resume',
    icon: CheckSquare,
  },
  {
    id: 'interview-qa',
    title: 'Interview Q&A',
    meta: 'Exam Mode · Know More',
    description:
      'Practice role-specific questions one by one, receive instant rubric scoring, and jump straight to study guides.',
    cta: 'Open Interview Q&A',
    icon: MessageSquareText,
  },
  {
    id: 'study-concepts',
    title: 'Study Concepts',
    meta: '3 Tiers · Deep Dives',
    description:
      'Follow structured learning paths from Beginner to Advanced with core concepts, pitfalls, and curated links.',
    cta: 'Browse Study Path',
    icon: BookOpen,
  },
  {
    id: 'mock-interview',
    title: 'Mock Interview',
    meta: 'Voice & Text · Report',
    description:
      'Simulate a multi-question interview session with real-time tracking, answer evaluation, and summary reports.',
    cta: 'Start Mock Session',
    icon: Video,
  },
  {
    id: 'fake-job-detection',
    title: 'Fake Job Detection',
    meta: 'Scam Signals · Listing Audit',
    description:
      'Inspect suspicious job listings, recruiter emails, and offers for red flags and verification cues.',
    cta: 'Inspect Job Listing',
    icon: ShieldAlert,
  },
];

export function OverviewPage({ stats, onNavigate }: OverviewPageProps) {
  const trendData = buildPracticeTrendSeries(
    stats.questionsPracticed,
    stats.mockSessionsCompleted
  );

  const metricCards = [
    {
      label: 'Latest ATS Score',
      value: stats.lastAtsScore !== null ? `${stats.lastAtsScore}/100` : '—',
      caption: `${stats.atsChecksRun} ${stats.atsChecksRun === 1 ? 'check' : 'checks'} completed`,
      accent: 'text-teal-700',
    },
    {
      label: 'Questions Practiced',
      value: stats.questionsPracticed,
      caption: 'Evaluated across Q&A & mocks',
      accent: 'text-slate-900',
    },
    {
      label: 'Topics Mastered',
      value: stats.topicsStudied.length,
      caption: 'Tracked in Study Concepts',
      accent: 'text-emerald-700',
    },
    {
      label: 'Latest Mock Score',
      value: stats.lastMockScore !== null ? `${stats.lastMockScore}%` : '—',
      caption: `${stats.mockSessionsCompleted} ${stats.mockSessionsCompleted === 1 ? 'session' : 'sessions'} finished`,
      accent: 'text-amber-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Primary Readiness Hero */}
      <section className="relative overflow-hidden bg-[#0B192C] text-white border border-[#1A314F] rounded-2xl p-6 sm:p-8 lg:p-10 card-elevated">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #5eead4 1px, transparent 1px), linear-gradient(to bottom, #5eead4 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-3xl">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3 leading-[1.15]"
            style={{ textWrap: 'balance' }}
          >
            Prepare for your next technical interview in one focused workspace
          </h1>
          <p className="text-base text-slate-300 leading-relaxed mb-7 max-w-2xl">
            Build or AI-correct an ATS-ready resume, verify keyword alignment against real job
            descriptions, practice exam-mode Q&amp;A, and complete timed mock interviews.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onNavigate('resume-builder')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl transition-colors whitespace-nowrap shadow-sm"
            >
              Build Resume
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onNavigate('mock-interview')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-100 bg-[#132642] border border-[#24426B] hover:bg-[#193255] rounded-xl transition-colors whitespace-nowrap"
            >
              Start Mock Interview
            </motion.button>
          </div>
        </div>
      </section>

      {/* 4-Column Readiness Metrics Row */}
      <section aria-label="Preparation summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white border border-slate-200 rounded-xl p-5 card-elevated card-interactive hover:border-teal-300"
            >
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`mt-2 text-2xl font-bold font-mono tabular-nums ${card.accent}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.caption}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Practice Activity Trends Chart */}
      <section
        aria-labelledby="practice-trends-heading"
        className="bg-white border border-slate-200 rounded-xl p-6 card-elevated"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="practice-trends-heading" className="text-base font-semibold text-slate-900">
              Practice Activity Trends
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly questions practiced and mock sessions (includes sample baseline)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#0D9488] shrink-0" aria-hidden="true" />
              Questions Practiced
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706] shrink-0" aria-hidden="true" />
              Mock Sessions Completed
            </span>
          </div>
        </div>

        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height={256}>
            <BarChart
              data={trendData}
              barGap={6}
              margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(148, 163, 184, 0.25)"
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }}
                contentStyle={{
                  backgroundColor: '#0B192C',
                  color: '#F8FAFC',
                  borderColor: '#1E3A5F',
                  borderRadius: '0.625rem',
                  fontSize: '12px',
                  boxShadow: '0 8px 20px rgba(11, 25, 44, 0.25)',
                }}
              />
              <Bar
                dataKey="questionsPracticed"
                name="Questions Practiced"
                fill="#0D9488"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
                isAnimationActive={false}
              />
              <Bar
                dataKey="mockSessionsCompleted"
                name="Mock Sessions Completed"
                fill="#D97706"
                radius={[4, 4, 0, 0]}
                maxBarSize={34}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Suite Modules Grid */}
      <section aria-labelledby="suite-modules-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 id="suite-modules-heading" className="text-lg font-semibold text-slate-900">
            Preparation Tools
          </h2>
          <p className="text-xs text-slate-500">
            6 integrated modules · 12 engineering &amp; product roles
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SUITE_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between card-elevated card-interactive hover:border-teal-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform duration-200">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-xs text-slate-500">{mod.meta}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{mod.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{mod.description}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(mod.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-600 transition-colors self-start"
                >
                  <span>{mod.cta}</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
