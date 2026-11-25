import {
  BookOpen,
  Briefcase,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Video,
  X,
} from 'lucide-react';
import type { AuthUser, WorkspaceView } from '../types';

interface SidebarProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  user: AuthUser;
  profilePhotoUrl?: string;
  displayName?: string;
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
  { id: 'study-concepts', label: 'Study Concepts', icon: BookOpen },
  { id: 'mock-interview', label: 'Mock Interview', icon: Video },
  { id: 'fake-job-detection', label: 'Fake Job Detection', icon: ShieldAlert },
];

export function Sidebar({
  activeView,
  onNavigate,
  user,
  profilePhotoUrl,
  displayName,
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

      </nav>

      {/* Profile Button Footer */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div
          className={`flex items-center justify-between gap-2 rounded-xl p-1.5 transition-colors ${
            activeView === 'profile' ? 'bg-indigo-50' : 'hover:bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSelect('profile')}
            aria-current={activeView === 'profile' ? 'page' : undefined}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          >
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={displayName || user.name}
                className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold shrink-0">
                {(displayName || user.name)
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? '')
                  .join('') || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {displayName || user.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Profile &amp; Session Progress
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
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
