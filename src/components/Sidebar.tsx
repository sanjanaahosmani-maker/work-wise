import {
  BookOpen,
  Briefcase,
  CheckSquare,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Video,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
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

  const resolvedName = displayName || user.name;
  const initials =
    resolvedName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B192C] text-slate-100 border-r border-[#172B47]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-[#172B47] shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="group flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-teal-400 rounded-lg py-1"
        >
          <motion.span
            whileHover={{ scale: 1.06, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D9488] text-white shadow-sm"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
          </motion.span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-white">
              IntervYou
            </span>
            <span className="block text-[11px] font-medium text-teal-300/80">
              Interview Prep
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:bg-[#152842] hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label="Workspace navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-medium text-slate-400">
          Modules
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-400 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-300 hover:bg-[#13253E] hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebarActiveNav"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#0D9488]/20 border border-[#14B8A6]/40 -z-0"
                />
              )}
              <span className="relative z-10 flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-teal-300'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {isActive && (
                <ChevronRight
                  className="relative z-10 h-3.5 w-3.5 text-teal-300 shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Button Footer */}
      <div className="p-3 border-t border-[#172B47] shrink-0">
        <div
          className={`flex items-center justify-between gap-2 rounded-xl p-2 border transition-colors ${
            activeView === 'profile'
              ? 'bg-[#13253E] border-[#14B8A6]/50'
              : 'bg-[#0E2036] border-[#1B314E] hover:border-[#294870]'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSelect('profile')}
            aria-current={activeView === 'profile' ? 'page' : undefined}
            className="group flex items-center gap-2.5 min-w-0 flex-1 text-left"
          >
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={resolvedName}
                className="h-9 w-9 rounded-full object-cover border-2 border-teal-400/50 shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D9488] text-white text-xs font-bold shrink-0 transition-transform duration-150 group-hover:scale-105">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{resolvedName}</p>
              <p className="text-[11px] text-teal-300/80 truncate">
                Profile &amp; Progress
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1B3252] transition-colors shrink-0"
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
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[82vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
