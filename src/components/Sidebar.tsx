import {
  BookOpen,
  Briefcase,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquareText,
  ShieldAlert,
  Video,
  X,
} from 'lucide-react';
import type { AuthUser, WorkspaceStats, WorkspaceView } from '../types';

interface SidebarProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  stats: WorkspaceStats;
  user: AuthUser | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: WorkspaceView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'resume-builder', label: 'Resume Builder', icon: FileText },
  { id: 'ats-checker', label: 'ATS Checker', icon: CheckSquare },
  { id: 'interview-qa', label: 'Interview Q&A', icon: MessageSquareText },
  { id: 'study-concepts', label: 'Study Concepts', icon: BookOpen },
  { id: 'mock-interview', label: 'Mock Interview', icon: Video },
  { id: 'fake-job-detection', label: 'Fake Job Detection', icon: ShieldAlert },
];

export function Sidebar({
  activeView,
  onNavigate,
  stats,
  user,
  onOpenAuth,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (view: WorkspaceView) => {
    onNavigate(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-[15px] tracking-tight text-slate-900 whitespace-nowrap">
            IntervYou
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label="Workspace navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Quiet Progress Summary */}
        <div className="pt-6 mt-6 border-t border-slate-200 px-3">
          <p className="text-xs font-medium text-slate-500 mb-3">Session Progress</p>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Resumes built</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900">
                {stats.resumesBuilt}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">ATS checks</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900">
                {stats.atsChecksRun}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Topics studied</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900">
                {stats.topicsStudied.length}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Mock interviews</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900">
                {stats.mockSessionsCompleted}
              </dd>
            </div>
          </dl>
        </div>
      </nav>

      {/* Account Footer */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        {user ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenAuth('login');
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenAuth('register');
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
