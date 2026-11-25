import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, CheckCircle2, Circle, ExternalLink, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AVAILABLE_ROLES, CURATED_STUDY_PATHS } from '../data/catalog';
import { apiRequest } from '../lib/api';
import type {
  StudyConceptRedirectPayload,
  StudyLevel,
  StudyPathMap,
  StudyTopic,
  TopicDetails,
} from '../types';
import { buildFallbackStudyPath } from '../utils/fallbackGenerators';

interface StudyConceptsPageProps {
  studiedTopics: string[];
  onToggleTopicStudied: (topicKey: string) => void;
  initialConcept?: StudyConceptRedirectPayload | null;
  onClearInitialConcept?: () => void;
}

const LEVELS: { id: StudyLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export function StudyConceptsPage({
  studiedTopics,
  onToggleTopicStudied,
  initialConcept,
  onClearInitialConcept,
}: StudyConceptsPageProps) {
  const [role, setRole] = useState('Frontend Developer');
  const [level, setLevel] = useState<StudyLevel>('intermediate');
  const [studyPath, setStudyPath] = useState<StudyPathMap>(
    CURATED_STUDY_PATHS['Frontend Developer']
  );
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | StudyLevel>('all');
  const [loadingPath, setLoadingPath] = useState(false);
  const [error, setError] = useState('');

  // Topic Deep Dive Modal
  const [selectedTopic, setSelectedTopic] = useState<StudyTopic | null>(null);
  const [topicDetails, setTopicDetails] = useState<TopicDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [qaQuestionContext, setQaQuestionContext] = useState<string | null>(null);

  useEffect(() => {
    if (!initialConcept) return;

    const targetRole = initialConcept.role || 'Software Engineer';
    if (AVAILABLE_ROLES.includes(targetRole)) {
      setRole(targetRole);
      setStudyPath(buildFallbackStudyPath(targetRole, level));
    }

    const topicTitle =
      initialConcept.keyPoints && initialConcept.keyPoints.length > 0
        ? initialConcept.keyPoints.slice(0, 2).join(' & ')
        : initialConcept.question.replace(/\?+$/, '').slice(0, 80);

    setSelectedTopic({
      topic: topicTitle,
      description: initialConcept.question,
      importance: 'Core interview concept from your Q&A session',
      key_points: initialConcept.keyPoints ?? [],
      resources: [],
    });
    setQaQuestionContext(initialConcept.question);
    setTopicDetails(null);
    setDetailsError('');
    setLoadingDetails(true);
    onClearInitialConcept?.();

    apiRequest<{ success: boolean; topic_details: TopicDetails }>('/study/topic-from-qa', {
      method: 'POST',
      body: JSON.stringify({
        role: targetRole,
        question: initialConcept.question,
        user_answer: initialConcept.userAnswer,
        ideal_answer: initialConcept.idealAnswer,
        key_points: initialConcept.keyPoints ?? [],
      }),
    })
      .then((res) => {
        setTopicDetails(res.topic_details);
      })
      .catch((err) => {
        setDetailsError(
          err instanceof Error ? err.message : 'Could not fetch AI deep-dive details.'
        );
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [initialConcept]);

  const handleLoadCurated = (nextRole: string) => {
    setStudyPath(buildFallbackStudyPath(nextRole, level));
  };

  const handleGeneratePath = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!role) {
      setError('Select a target role first.');
      return;
    }

    setLoadingPath(true);
    try {
      const res = await apiRequest<{ success: boolean; concepts: StudyPathMap }>(
        '/study/concepts',
        {
          method: 'POST',
          body: JSON.stringify({
            role,
            experience_level: level,
          }),
        }
      );
      setStudyPath(res.concepts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study path.');
    } finally {
      setLoadingPath(false);
    }
  };

  const openTopicDeepDive = async (topic: StudyTopic) => {
    setSelectedTopic(topic);
    setQaQuestionContext(null);
    setTopicDetails(null);
    setDetailsError('');
    setLoadingDetails(true);

    try {
      const res = await apiRequest<{ success: boolean; topic_details: TopicDetails }>(
        `/study/topic/${encodeURIComponent(topic.topic)}?role=${encodeURIComponent(role)}`
      );
      setTopicDetails(res.topic_details);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : 'Could not fetch AI deep-dive details.'
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const tiersToRender = LEVELS.filter(
    (t) => activeTierFilter === 'all' || activeTierFilter === t.id
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Study Concepts</h1>
        <p className="text-sm text-slate-600 mt-1">
          Follow a structured Beginner-to-Advanced roadmap for your target role and mark mastered concepts.
        </p>
      </div>

      {/* Role & Level Controls */}
      <form
        onSubmit={handleGeneratePath}
        noValidate
        className="bg-white border border-slate-200 rounded-xl p-5 card-elevated"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 px-3.5 py-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label htmlFor="study-role" className="block text-xs font-medium text-slate-700 mb-1">
              Target Role *
            </label>
            <select
              id="study-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                handleLoadCurated(e.target.value);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="study-level" className="block text-xs font-medium text-slate-700 mb-1">
              Focus Experience Level
            </label>
            <select
              id="study-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as StudyLevel)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={loadingPath}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {loadingPath ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Building Path...
                </>
              ) : (
                'Generate AI Path'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Tier Segmented Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter study tiers"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl relative"
        >
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((tier) => {
            const active = activeTierFilter === tier;
            return (
              <button
                key={tier}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTierFilter(tier)}
                className={`relative z-10 px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap ${
                  active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="studyTierPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                  />
                )}
                {tier === 'all' ? 'All Levels' : tier}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          Click any concept card for an in-depth guide and practice problems.
        </p>
      </div>

      {/* Organized Levels */}
      <div className="space-y-8">
        {tiersToRender.map((tier) => {
          const topics = studyPath[tier.id] ?? [];
          if (topics.length === 0) return null;

          return (
            <section key={tier.id} className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-semibold text-slate-900">{tier.label} Track</h2>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {topics.length} {topics.length === 1 ? 'concept' : 'concepts'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topics.map((topic) => {
                  const topicKey = `${role}::${topic.topic}`;
                  const isStudied = studiedTopics.includes(topicKey);
                  return (
                    <div
                      key={topic.topic}
                      onClick={() => openTopicDeepDive(topic)}
                      className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between card-elevated card-interactive hover:border-teal-300"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-base font-semibold text-slate-900">{topic.topic}</h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTopicStudied(topicKey);
                            }}
                            aria-label={
                              isStudied
                                ? `Mark ${topic.topic} as not studied`
                                : `Mark ${topic.topic} as studied`
                            }
                            className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 transition-colors ${
                              isStudied
                                ? 'text-emerald-700'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {isStudied ? (
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Circle className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span>{isStudied ? 'Studied' : 'Mark done'}</span>
                          </button>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                          {topic.description}
                        </p>

                        {topic.key_points.length > 0 && (
                          <p className="text-xs text-slate-500 mb-4">
                            {topic.key_points.join(' · ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500 truncate pr-3">
                          {topic.importance}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTopicDeepDive(topic);
                          }}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-600 whitespace-nowrap shrink-0"
                        >
                          Open Guide
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {tiersToRender.every((t) => (studyPath[t.id]?.length ?? 0) === 0) && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              No study topics in this level
            </h2>
            <p className="text-sm text-slate-500">
              Generate an AI study path above for customized concepts tailored to {role}.
            </p>
          </div>
        )}
      </div>

      {/* Topic Detail Modal */}
      <AnimatePresence>
        {selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                <div>
                  <h2 id="topic-modal-title" className="text-base font-semibold text-slate-900">
                    {selectedTopic.topic}
                  </h2>
                  <p className="text-xs text-slate-500">{role} Study Guide</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  aria-label="Close topic guide modal"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {qaQuestionContext && (
                  <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3.5">
                    <p className="text-xs font-semibold text-teal-700 mb-1">
                      From Interview Q&amp;A
                    </p>
                    <p className="text-xs font-medium text-slate-800">{qaQuestionContext}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 mb-1">Overview</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {topicDetails?.description ?? selectedTopic.description}
                  </p>
                </div>

                {loadingDetails && (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
                    Loading deep-dive concepts, example problems, and common pitfalls...
                  </div>
                )}

                {detailsError && (
                  <div className="px-3.5 py-2.5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                    {detailsError} Showing core outline below.
                  </div>
                )}

                {topicDetails ? (
                  <>
                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">Key Concepts</h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                        {topicDetails.key_concepts.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">Example Problems</h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                        {topicDetails.example_problems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-amber-700 mb-2">Common Mistakes</h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                        {topicDetails.common_mistakes.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">
                        Recommended Resources
                      </h3>
                      <ul className="space-y-2 text-sm">
                        {topicDetails.resources.map((res, i) => (
                          <li key={i} className="flex items-center justify-between gap-2">
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-600 font-medium"
                            >
                              <span>{res.name}</span>
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                            <span className="text-xs text-slate-500 capitalize">{res.type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  !loadingDetails && (
                    <div className="space-y-4 pt-3 border-t border-slate-100">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-700 mb-2">Key Points</h3>
                        <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
                          {selectedTopic.key_points.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-700 mb-2">Resources</h3>
                        <p className="text-sm text-slate-600">
                          {selectedTopic.resources.join(' · ')}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleTopicStudied(`${role}::${selectedTopic.topic}`)}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-600"
                >
                  {studiedTopics.includes(`${role}::${selectedTopic.topic}`)
                    ? 'Marked as Studied'
                    : 'Mark Concept as Studied'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
