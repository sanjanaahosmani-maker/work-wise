import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { AtsCheckerPage } from './components/AtsCheckerPage';
import { AuthModal } from './components/AuthModal';
import { FakeJobDetectionPage } from './components/FakeJobDetectionPage';
import { InterviewQaPage } from './components/InterviewQaPage';
import { MockInterviewPage } from './components/MockInterviewPage';
import { OverviewPage } from './components/OverviewPage';
import { ResumeBuilderPage } from './components/ResumeBuilderPage';
import { Sidebar } from './components/Sidebar';
import { StudyConceptsPage } from './components/StudyConceptsPage';
import { apiRequest } from './lib/api';
import type { AuthUser, WorkspaceStats, WorkspaceView } from './types';

const STATS_STORAGE_KEY = 'ai_interview_prep_suite_stats_v1';

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
};

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
  const [sharedResumeText, setSharedResumeText] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth state kept strictly in React memory (never localStorage)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage quota errors
    }
  }, [stats]);

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

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        stats={stats}
        user={user}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
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

          <div className="flex items-center gap-3 shrink-0">
            {activeView !== 'overview' && activeView !== 'mock-interview' && (
              <button
                type="button"
                onClick={() => setActiveView('mock-interview')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">Start </span>Mock Interview
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
              <InterviewQaPage onQuestionPracticed={handleQuestionPracticed} />
            )}
            {activeView === 'study-concepts' && (
              <StudyConceptsPage
                studiedTopics={stats.topicsStudied}
                onToggleTopicStudied={handleToggleTopicStudied}
              />
            )}
            {activeView === 'mock-interview' && (
              <MockInterviewPage onSessionCompleted={handleMockCompleted} />
            )}
            {activeView === 'fake-job-detection' && <FakeJobDetectionPage />}
          </div>
        </main>
      </div>

      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSwitchMode={(next) => setAuthModalMode(next)}
          onSuccess={(authedUser, token) => {
            setUser(authedUser);
            setAuthToken(token);
          }}
        />
      )}
    </div>
  );
}
