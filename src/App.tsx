import { useEffect, useState } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { AtsCheckerPage } from './components/AtsCheckerPage';
import { FakeJobDetectionPage } from './components/FakeJobDetectionPage';
import { InterviewQaPage } from './components/InterviewQaPage';
import { LoginPage } from './components/LoginPage';
import { MockInterviewPage } from './components/MockInterviewPage';
import { OverviewPage } from './components/OverviewPage';
import { ProfilePage } from './components/ProfilePage';
import { ResumeBuilderPage } from './components/ResumeBuilderPage';
import { Sidebar } from './components/Sidebar';
import { StudyConceptsPage } from './components/StudyConceptsPage';
import { apiRequest } from './lib/api';
import type {
  AuthUser,
  StudyConceptRedirectPayload,
  UserProfileDetails,
  WorkspaceStats,
  WorkspaceView,
} from './types';

const STATS_STORAGE_KEY = 'ai_interview_prep_suite_stats_v1';
const THEME_STORAGE_KEY = 'workwise_theme_v1';

function loadSavedTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage errors
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const DEFAULT_STATS: WorkspaceStats = {
  resumesBuilt: 0,
  atsChecksRun: 0,
  questionsPracticed: 0,
  topicsStudied: [],
  mockSessionsCompleted: 0,
  lastAtsScore: null,
  lastMockScore: null,
};

const VIEW_TITLES: Record<WorkspaceView, string> = {
  overview: 'Overview',
  'resume-builder': 'Resume Builder',
  'ats-checker': 'ATS Checker',
  'interview-qa': 'Interview Q&A',
  'study-concepts': 'Study Concepts',
  'mock-interview': 'Mock Interview',
  'fake-job-detection': 'Fake Job Detection',
  profile: 'Profile',
};

const PROFILE_STORAGE_PREFIX = 'workwise_user_profile_v1_';

function loadUserProfile(user: AuthUser): UserProfileDetails {
  const fallback: UserProfileDetails = {
    name: user.name,
    headline: '',
    targetRole: '',
    location: '',
    bio: '',
    photoDataUrl: '',
  };
  try {
    const raw = window.localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${user.email.toLowerCase()}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UserProfileDetails>;
    return {
      ...fallback,
      ...parsed,
      name: parsed.name?.trim() || user.name,
    };
  } catch {
    return fallback;
  }
}

function loadSavedStats(): WorkspaceStats {
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<WorkspaceStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
      topicsStudied: Array.isArray(parsed.topicsStudied) ? parsed.topicsStudied : [],
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as WorkspaceView | null;
    if (viewParam && viewParam in VIEW_TITLES) return viewParam;
    if (params.get('autostart') === '1') return 'resume-builder';
    return 'overview';
  });

  const [stats, setStats] = useState<WorkspaceStats>(loadSavedStats);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadSavedTheme);
  const [sharedResumeText, setSharedResumeText] = useState('');
  const [pendingStudyConcept, setPendingStudyConcept] =
    useState<StudyConceptRedirectPayload | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth state kept strictly in React memory (never localStorage)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDetails | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage quota errors
    }
  }, [stats]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await apiRequest('/auth/logout', { method: 'POST' }, authToken);
      }
    } catch {
      // Clear local session regardless
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  const handleResumeGenerated = (resumeText: string) => {
    setSharedResumeText(resumeText);
    setStats((prev) => ({
      ...prev,
      resumesBuilt: prev.resumesBuilt + 1,
    }));
  };

  const handleSendToAts = (resumeText: string) => {
    setSharedResumeText(resumeText);
    setActiveView('ats-checker');
  };

  const handleAtsComplete = (score: number) => {
    setStats((prev) => ({
      ...prev,
      atsChecksRun: prev.atsChecksRun + 1,
      lastAtsScore: score,
    }));
  };

  const handleQuestionPracticed = () => {
    setStats((prev) => ({
      ...prev,
      questionsPracticed: prev.questionsPracticed + 1,
    }));
  };

  const handleToggleTopicStudied = (topicKey: string) => {
    setStats((prev) => {
      const exists = prev.topicsStudied.includes(topicKey);
      return {
        ...prev,
        topicsStudied: exists
          ? prev.topicsStudied.filter((t) => t !== topicKey)
          : [...prev.topicsStudied, topicKey],
      };
    });
  };

  const handleMockCompleted = (averageScore: number, questionsAnswered: number) => {
    setStats((prev) => ({
      ...prev,
      mockSessionsCompleted: prev.mockSessionsCompleted + 1,
      questionsPracticed: prev.questionsPracticed + questionsAnswered,
      lastMockScore: averageScore,
    }));
  };

  if (!user) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onSuccess={(authedUser, token) => {
          setUser(authedUser);
          setAuthToken(token);
          setUserProfile(loadUserProfile(authedUser));
        }}
      />
    );
  }

  const activeProfile: UserProfileDetails = userProfile ?? {
    name: user.name,
    headline: '',
    targetRole: '',
    location: '',
    bio: '',
    photoDataUrl: '',
  };

  const handleSaveProfile = (next: UserProfileDetails) => {
    setUserProfile(next);
    try {
      window.localStorage.setItem(
        `${PROFILE_STORAGE_PREFIX}${user.email.toLowerCase()}`,
        JSON.stringify(next)
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        user={user}
        profilePhotoUrl={activeProfile.photoDataUrl}
        displayName={activeProfile.name}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => setActiveView('overview')}
                className="hidden sm:inline text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Workspace
              </button>
              <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {VIEW_TITLES[activeView]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
            {activeView !== 'interview-qa' && (
              <button
                type="button"
                onClick={() => setActiveView('interview-qa')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Interview Q&amp;A
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-6xl mx-auto">
            {activeView === 'overview' && (
              <OverviewPage stats={stats} onNavigate={setActiveView} />
            )}
            {activeView === 'resume-builder' && (
              <ResumeBuilderPage
                onResumeGenerated={handleResumeGenerated}
                onSendToAts={handleSendToAts}
              />
            )}
            {activeView === 'ats-checker' && (
              <AtsCheckerPage
                initialResumeText={sharedResumeText}
                onAnalysisComplete={handleAtsComplete}
              />
            )}
            {activeView === 'interview-qa' && (
              <InterviewQaPage
                onQuestionPracticed={handleQuestionPracticed}
                onKnowMore={(payload) => {
                  setPendingStudyConcept(payload);
                  setActiveView('study-concepts');
                }}
              />
            )}
            {activeView === 'study-concepts' && (
              <StudyConceptsPage
                studiedTopics={stats.topicsStudied}
                onToggleTopicStudied={handleToggleTopicStudied}
                initialConcept={pendingStudyConcept}
                onClearInitialConcept={() => setPendingStudyConcept(null)}
              />
            )}
            {activeView === 'mock-interview' && (
              <MockInterviewPage onSessionCompleted={handleMockCompleted} />
            )}
            {activeView === 'fake-job-detection' && <FakeJobDetectionPage />}
            {activeView === 'profile' && (
              <ProfilePage
                user={user}
                profile={activeProfile}
                onSaveProfile={handleSaveProfile}
                stats={stats}
                onNavigate={setActiveView}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
