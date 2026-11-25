import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Camera,
  Check,
  CheckSquare,
  FileText,
  MessageSquareText,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AVAILABLE_ROLES } from '../data/catalog';
import type {
  AuthUser,
  UserProfileDetails,
  WorkspaceStats,
  WorkspaceView,
} from '../types';

interface ProfilePageProps {
  user: AuthUser;
  profile: UserProfileDetails;
  onSaveProfile: (next: UserProfileDetails) => void;
  stats: WorkspaceStats;
  onNavigate: (view: WorkspaceView) => void;
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

export function ProfilePage({
  user,
  profile,
  onSaveProfile,
  stats,
  onNavigate,
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'progress'>('profile');
  const [draft, setDraft] = useState<UserProfileDetails>(profile);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const initials =
    (draft.name || user.name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (PNG, JPG, WebP, or GIF).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Profile photo must be 2 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = { ...draft, photoDataUrl: reader.result };
        setDraft(updated);
        onSaveProfile(updated);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
      }
    };
    reader.onerror = () => setPhotoError('Failed to read selected image.');
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    const updated = { ...draft, photoDataUrl: '' };
    setDraft(updated);
    onSaveProfile(updated);
    setPhotoError('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...draft,
      name: draft.name.trim() || user.name,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const progressItems: {
    label: string;
    value: string | number;
    subtitle: string;
    view: WorkspaceView;
    icon: typeof FileText;
  }[] = [
    {
      label: 'Resumes built',
      value: stats.resumesBuilt,
      subtitle: 'Drafted & AI-corrected resumes',
      view: 'resume-builder',
      icon: FileText,
    },
    {
      label: 'ATS checks',
      value: stats.atsChecksRun,
      subtitle:
        stats.lastAtsScore !== null
          ? `Latest ATS score: ${stats.lastAtsScore}/100`
          : 'Run an ATS audit to track score',
      view: 'ats-checker',
      icon: CheckSquare,
    },
    {
      label: 'Questions practiced',
      value: stats.questionsPracticed,
      subtitle: 'Evaluated in Q&A exam & mocks',
      view: 'interview-qa',
      icon: MessageSquareText,
    },
    {
      label: 'Topics studied',
      value: stats.topicsStudied.length,
      subtitle: 'Concepts marked mastered',
      view: 'study-concepts',
      icon: BookOpen,
    },
    {
      label: 'Mock interviews',
      value: stats.mockSessionsCompleted,
      subtitle:
        stats.lastMockScore !== null
          ? `Latest mock score: ${stats.lastMockScore}/100`
          : 'Complete a mock session',
      view: 'mock-interview',
      icon: Video,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your profile details, upload your avatar photo, and track your session progress.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 relative">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeTab === 'profile' && (
              <motion.span
                layoutId="profileTabPill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
              />
            )}
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'progress'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {activeTab === 'progress' && (
              <motion.span
                layoutId="profileTabPill"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
              />
            )}
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Session Progress
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Photo & Identity Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4 card-elevated">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="group relative mx-auto h-24 w-24 cursor-pointer rounded-full"
              >
                {draft.photoDataUrl ? (
                  <img
                    src={draft.photoDataUrl}
                    alt={draft.name || user.name}
                    className="h-24 w-24 rounded-full object-cover border-2 border-teal-500/40 shadow-xs"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-[#0D9488] text-white flex items-center justify-center text-2xl font-bold shadow-xs">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {draft.name || user.name}
                </h2>
                <p className="text-xs text-slate-500">{user.email}</p>
                {draft.headline && (
                  <p className="text-xs font-medium text-teal-700 mt-1">{draft.headline}</p>
                )}
              </div>

              {photoError && (
                <p role="alert" className="text-xs text-rose-600">
                  {photoError}
                </p>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Upload profile photo"
              />

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {draft.photoDataUrl ? 'Change Photo' : 'Upload Photo'}
                </button>
                {draft.photoDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">PNG, JPG, WebP, or GIF (max 2 MB)</p>
            </div>

            {/* Profile Form */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4 card-elevated"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Your Profile</h2>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Saved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={user.name}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-headline"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Current Role / Headline
                  </label>
                  <input
                    id="profile-headline"
                    type="text"
                    value={draft.headline}
                    onChange={(e) => setDraft((prev) => ({ ...prev, headline: e.target.value }))}
                    placeholder="e.g., Full Stack Engineer · 3 yrs exp"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-target-role"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Target Role
                  </label>
                  <select
                    id="profile-target-role"
                    value={draft.targetRole}
                    onChange={(e) => setDraft((prev) => ({ ...prev, targetRole: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Select target role...</option>
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-location"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Location
                </label>
                <input
                  id="profile-location"
                  type="text"
                  value={draft.location}
                  onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., San Francisco, CA (Remote)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label htmlFor="profile-bio" className="block text-xs font-medium text-slate-700 mb-1">
                  Career Goal / Bio
                </label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  value={draft.bio}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Briefly describe your target companies, focus areas, and interview timeline..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="progress-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {progressItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  className="group text-left bg-white border border-slate-200 hover:border-teal-300 card-elevated card-interactive rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{item.label}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {item.value}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{item.subtitle}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-teal-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
