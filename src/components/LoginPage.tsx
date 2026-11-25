import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiRequest } from '../lib/api';
import type { AuthUser } from '../types';

interface LoginPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
}

const WORKFLOW_STAGES = [
  {
    stage: 'Resume Builder',
    detail: 'PDF, DOCX, or LinkedIn import with AI restructuring',
    metric: 'ATS-ready',
  },
  {
    stage: 'Interview Q&A',
    detail: 'Exam-mode practice with instant rubric scoring',
    metric: '12 roles',
  },
  {
    stage: 'Study Concepts',
    detail: 'Targeted deep dives linked directly from missed answers',
    metric: '3 tiers',
  },
  {
    stage: 'Mock Interview',
    detail: 'Timed voice & text sessions with final report',
    metric: 'Real-time',
  },
];

export function LoginPage({ theme, onToggleTheme, onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim() || !email.trim() || !password) {
        setError('All fields are required.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password, confirm_password: confirmPassword };

      const res = await apiRequest<{ success: boolean; user: AuthUser; token: string }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      onSuccess(res.user, res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-slate-900">
      {/* Left Showcase Rail */}
      <aside className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between bg-[#0B192C] text-slate-100 p-10 xl:p-14 relative overflow-hidden border-r border-[#172B47]">
        {/* Architectural coordinate grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #5eead4 1px, transparent 1px), linear-gradient(to bottom, #5eead4 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.06, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D9488] text-white shadow-sm"
          >
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </motion.div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-white">IntervYou</span>
            <span className="block text-xs font-medium text-teal-300/80">Interview Prep</span>
          </div>
        </div>

        {/* Core Thesis & Workflow Proof */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-xl space-y-8 my-auto py-8"
        >
          <div className="space-y-4">
            <h1
              className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-[1.14]"
              style={{ textWrap: 'balance' }}
            >
              Step into every technical interview prepared.
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-lg">
              One focused workspace to refine your resume, rehearse role-specific questions in exam
              mode, and close concept gaps before interview day.
            </p>
          </div>

          <div className="border border-[#1A314F] rounded-xl bg-[#081322]/80 divide-y divide-[#172B47]">
            {WORKFLOW_STAGES.map((item) => (
              <div
                key={item.stage}
                className="group flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#10233C]/70 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <CheckCircle2
                    className="h-4 w-4 text-teal-400 shrink-0 mt-0.5 transition-transform duration-150 group-hover:scale-110"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.stage}</p>
                    <p className="text-xs text-slate-400 truncate">{item.detail}</p>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-amber-400 shrink-0">
                  {item.metric}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quiet Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-[#172B47]">
          <span>Role-specific evaluation &amp; ATS scoring</span>
          <span className="text-teal-300/90">Groq AI · Light &amp; Dark</span>
        </div>
      </aside>

      {/* Right Authentication Canvas */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-0 lg:p-12 bg-[#F5F7F8] relative">
        {/* Mobile Brand Showcase Banner */}
        <div className="lg:hidden bg-[#0B192C] text-white px-6 py-5 border-b border-[#172B47] space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0D9488] text-white">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-sm font-bold text-white">IntervYou</span>
                <span className="block text-[11px] text-teal-300/80">Interview Prep</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-[#132642] border border-[#24426B] hover:bg-[#193255] rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                  Dark
                </>
              )}
            </button>
          </div>
          <p className="text-sm font-medium text-slate-200 leading-snug">
            Step into every technical interview prepared.
          </p>
        </div>

        {/* Desktop Top Theme Toggle */}
        <div className="hidden lg:flex items-center justify-end">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                Light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                Dark
              </>
            )}
          </motion.button>
        </div>

        {/* Centered Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm mx-auto my-auto px-6 py-8 lg:px-0 space-y-6"
        >
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your profile'}
            </h2>
            <p className="text-sm text-slate-600">
              {mode === 'login'
                ? 'Enter your credentials to resume your interview prep.'
                : 'Set up your profile with an email and 8+ character password.'}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-xl relative"
          >
            {(['login', 'register'] as const).map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(tab)}
                  className={`relative z-10 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="authModePill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80 -z-10"
                    />
                  )}
                  {tab === 'login' ? 'Log In' : 'Create Profile'}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="px-3.5 py-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="login-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="login-confirm-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors shadow-xs hover:shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {mode === 'login' ? 'Signing In...' : 'Creating Profile...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Log In to Workspace' : 'Create Profile & Continue'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-slate-500 pb-6 lg:pb-0 px-6 lg:px-0">
          Your session progress and profile stay synced in your workspace.
        </p>
      </main>
    </div>
  );
}
