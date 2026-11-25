import type {
  AnswerFeedback,
  AtsDeepReview,
  ExperienceLevel,
  InterviewQuestion,
  ResumeFormData,
  ResumeOptimization,
  StudyLevel,
  StudyPathMap,
  StudyTopic,
  TopicDetails,
} from '../types.js';
import { CURATED_QUESTIONS, CURATED_STUDY_PATHS } from '../data/catalog.js';
import { analyzeAtsResume, extractKeywords } from './atsScoring.js';
import { buildBaselineOptimization, categorizeSkills } from './resumeHelpers.js';

/**
 * Formats a candidate profile into a clean, ATS-friendly Markdown resume
 * when the upstream AI model is experiencing a 503 / rate-limit spike.
 */
export function buildStructuredResumeFallback(profile: ResumeFormData): string {
  const grouped = categorizeSkills(profile.skills);
  const firstSkill =
    grouped.languages[0] ||
    grouped.frameworks[0] ||
    grouped.tools[0] ||
    profile.skills.split(',')[0]?.trim() ||
    'modern software engineering';

  const contactParts = [profile.email.trim(), profile.phone.trim()].filter(Boolean);

  const skillLines: string[] = [];
  if (grouped.languages.length > 0) {
    skillLines.push(`- Programming Languages: ${grouped.languages.join(', ')}`);
  }
  if (grouped.frameworks.length > 0) {
    skillLines.push(`- Frameworks & Libraries: ${grouped.frameworks.join(', ')}`);
  }
  if (grouped.tools.length > 0) {
    skillLines.push(`- Tools & Infrastructure: ${grouped.tools.join(', ')}`);
  }
  if (grouped.other.length > 0) {
    skillLines.push(`- Core Competencies: ${grouped.other.join(', ')}`);
  }
  if (skillLines.length === 0) {
    skillLines.push(`- Technical Skills: ${profile.skills}`);
  }

  const normalizeSectionLines = (raw: string, defaultLine: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return `- ${defaultLine}`;
    return trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith('-') || l.startsWith('•') ? l : `- ${l}`))
      .join('\n');
  };

  const sections: string[] = [
    `# ${profile.name.trim()}`,
    contactParts.join(' | '),
    `## Professional Summary`,
    `Results-driven ${profile.target_role.trim()} with strong practical expertise in ${firstSkill} and full-lifecycle delivery. Proven record of building reliable, maintainable systems and collaborating across cross-functional teams to ship measurable impact.`,
    `## Work Experience`,
    normalizeSectionLines(
      profile.experience,
      `${profile.target_role.trim()} — Designed, implemented, and optimized production systems using ${firstSkill}.`
    ),
    `## Technical Skills`,
    skillLines.join('\n'),
    `## Education`,
    normalizeSectionLines(
      profile.education,
      `Bachelor's Degree in Computer Science or related technical field`
    ),
  ];

  if (profile.projects.trim()) {
    sections.push(`## Projects`, normalizeSectionLines(profile.projects, ''));
  }

  if (profile.certifications.trim()) {
    sections.push(`## Certifications`, normalizeSectionLines(profile.certifications, ''));
  }

  return sections.join('\n\n');
}

/**
 * Generates a role-specific interview question set of exact `count` items.
 */
export function buildFallbackQuestions(
  role: string,
  experienceLevel: ExperienceLevel,
  domain: string,
  count: number
): InterviewQuestion[] {
  const safeCount = Math.max(1, Math.min(15, Math.floor(count)));
  const cleanRole = role.trim() || 'Software Engineer';
  const cleanDomain = (domain || cleanRole).trim();

  const roleCatalog = CURATED_QUESTIONS[cleanRole];
  const basePool: InterviewQuestion[] = [];

  if (roleCatalog) {
    basePool.push(...(roleCatalog[experienceLevel] ?? []));
    for (const lvl of ['junior', 'mid', 'senior'] as const) {
      if (lvl !== experienceLevel && roleCatalog[lvl]) {
        basePool.push(...roleCatalog[lvl]);
      }
    }
  }

  const dynamicTemplates: InterviewQuestion[] = [
    {
      question: `What are the most critical architecture and quality trade-offs for a ${experienceLevel}-level ${cleanRole} working in ${cleanDomain}?`,
      ideal_answer: `A strong ${cleanRole} balances reliability, maintainability, and latency against delivery speed. In ${cleanDomain}, start by defining clear SLAs and data contracts, instrumenting observability early, automating regression checks in CI/CD, and choosing simple, well-understood patterns before introducing distributed complexity.`,
      key_points: [
        'Requirements & SLA definition',
        'Simplicity vs scalability trade-offs',
        'Automated testing & CI/CD',
        'Observability & production monitoring',
      ],
      evaluation_criteria: [
        'Articulates concrete trade-offs rather than generic buzzwords',
        'Connects technical choices to user or business outcomes',
      ],
    },
    {
      question: `Walk through how you would debug a sudden production performance regression in a ${cleanDomain} system as a ${cleanRole}.`,
      ideal_answer: `First, assess blast radius and mitigate immediate user impact via feature flags or rollback if necessary. Next, inspect recent deployments, metrics dashboards (p95/p99 latency, error rates, saturation), and structured logs or traces to isolate the bottleneck. Reproduce with a targeted benchmark or query plan, deploy a verified fix, and add regression alerts.`,
      key_points: [
        'Triage & blast-radius containment',
        'Telemetry, logs, and distributed traces',
        'Hypothesis-driven root-cause isolation',
        'Post-incident regression guardrails',
      ],
      evaluation_criteria: [
        'Follows a systematic measure-first debugging workflow',
        'Includes mitigation and prevention steps',
      ],
    },
    {
      question: `How do you ensure security, data integrity, and graceful error handling in ${cleanRole} deliverables?`,
      ideal_answer: `Validate and sanitize all untrusted inputs at the boundary, enforce least-privilege access controls, and use parameterized queries or type-safe schemas. Design idempotent retry paths with clear error codes, avoid leaking sensitive stack traces to clients, and log actionable diagnostics for operators.`,
      key_points: [
        'Boundary input validation',
        'Authentication & least-privilege authorization',
        'Idempotency & failure recovery',
        'Safe error reporting',
      ],
      evaluation_criteria: [
        'Covers both preventive security controls and runtime resilience',
        'Provides specific implementation examples',
      ],
    },
    {
      question: `Describe a complex technical project relevant to a ${cleanRole} role: how did you design it, what bottlenecks emerged, and how did you measure success?`,
      ideal_answer: `Structure your response using context, architectural decisions, the specific technical obstacle overcome, and quantified results (such as latency reduction, throughput gain, defect reduction, or developer velocity improvement). Highlight trade-offs considered and why your chosen approach won.`,
      key_points: [
        'Problem scope & constraints',
        'Key design alternatives considered',
        'Bottleneck resolution',
        'Quantified impact metrics',
      ],
      evaluation_criteria: [
        'Uses clear structured storytelling (STAR / technical design format)',
        'Cites measurable outcomes',
      ],
    },
    {
      question: `How do you approach automated testing and code review standards for a ${experienceLevel} ${cleanRole} team?`,
      ideal_answer: `Focus unit tests on pure business logic and edge cases, integration tests on API/database contracts, and end-to-end tests on critical user journeys. In code reviews, prioritize correctness, security, readability, and operational failure modes while letting linters and formatters handle style automatically.`,
      key_points: [
        'Testing pyramid balance (unit, integration, E2E)',
        'Deterministic, fast test suites',
        'High-signal code review checklist',
        'CI gate automation',
      ],
      evaluation_criteria: [
        'Distinguishes test layers and their ROI',
        'Emphasizes maintainable team workflows',
      ],
    },
    {
      question: `If traffic or data volume in your ${cleanDomain} platform grew 10x over the next quarter, which components would break first and how would you scale them?`,
      ideal_answer: `Database connections, unindexed queries, synchronous third-party calls, and hot cache keys typically saturate first. Address them by profiling hot paths, adding composite indexes and read caching, decoupling heavy work into asynchronous queues, and implementing rate limiting and horizontal autoscaling.`,
      key_points: [
        'Bottleneck identification (DB, network, compute)',
        'Caching & indexing strategies',
        'Asynchronous queue decoupling',
        'Rate limiting & backpressure',
      ],
      evaluation_criteria: [
        'Identifies realistic first-failure points',
        'Proposes incremental scaling steps',
      ],
    },
    {
      question: `How do you evaluate build-vs-buy decisions and third-party dependencies in a ${cleanDomain} environment?`,
      ideal_answer: `Assess whether the capability is core differentiating IP or commodity infrastructure, examine long-term maintenance burden, security posture, licensing, vendor lock-in, and operational observability. Wrap third-party integrations behind narrow internal interfaces so implementations can be swapped cleanly later.`,
      key_points: [
        'Core competency vs commodity',
        'Total cost of ownership & lock-in',
        'Adapter/interface isolation',
        'Security & SLA audit',
      ],
      evaluation_criteria: [
        'Balances speed-to-market with long-term maintainability',
        'Mentions abstraction boundaries',
      ],
    },
    {
      question: `Tell me about a time a technical decision you advocated for proved suboptimal in production. How did you detect it and course-correct?`,
      ideal_answer: `Be transparent about the original assumptions, the production telemetry or user feedback that surfaced the issue, how you aligned stakeholders on a migration plan without disrupting users, and what engineering guardrails you introduced afterward.`,
      key_points: [
        'Original assumptions & constraints',
        'Early detection signals',
        'Safe incremental migration',
        'Blameless learning',
      ],
      evaluation_criteria: [
        'Shows ownership and technical maturity',
        'Explains concrete remediation steps',
      ],
    },
  ];

  const combined = [...basePool, ...dynamicTemplates];
  const results: InterviewQuestion[] = [];
  for (let i = 0; i < safeCount; i++) {
    const template = combined[i % combined.length];
    results.push({
      ...template,
      question:
        i < combined.length
          ? template.question
          : `${template.question} (Scenario ${Math.floor(i / combined.length) + 1})`,
    });
  }

  return results;
}

/**
 * Ensures an AI-generated question list always meets the exact requested count
 * without duplicates by topping up from `buildFallbackQuestions` if the model returned fewer items.
 */
export function ensureExactQuestionCount(
  generated: InterviewQuestion[],
  role: string,
  experienceLevel: ExperienceLevel,
  domain: string,
  count: number
): InterviewQuestion[] {
  const safeCount = Math.max(1, Math.min(15, Math.floor(count)));
  const seen = new Set<string>();
  const normalized: InterviewQuestion[] = [];

  for (const item of generated) {
    const qText = (item?.question ?? '').trim();
    if (!qText) continue;
    const key = qText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      question: qText,
      ideal_answer: (item.ideal_answer ?? '').trim() || 'Provide a structured answer with clear trade-offs and concrete examples.',
      key_points: Array.isArray(item.key_points) && item.key_points.length > 0 ? item.key_points : ['Core mechanism', 'Trade-offs'],
      evaluation_criteria:
        Array.isArray(item.evaluation_criteria) && item.evaluation_criteria.length > 0
          ? item.evaluation_criteria
          : ['Technical accuracy', 'Practical depth'],
    });
    if (normalized.length === safeCount) return normalized;
  }

  if (normalized.length < safeCount) {
    const fallbackPool = buildFallbackQuestions(
      role,
      experienceLevel,
      domain,
      Math.max(safeCount, 12)
    );
    for (const fb of fallbackPool) {
      const key = fb.question.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(fb);
      if (normalized.length === safeCount) break;
    }
  }

  return normalized.slice(0, safeCount);
}

/**
 * Ensures every study tier (beginner, intermediate, advanced) contains at least 2 topics.
 */
export function ensureCompleteStudyPath(
  generated: StudyPathMap,
  role: string,
  level: StudyLevel
): StudyPathMap {
  const fallback = buildFallbackStudyPath(role, level);
  const mergeTier = (primary: StudyTopic[] | undefined, backup: StudyTopic[] | undefined) => {
    const list: StudyTopic[] = [];
    const seen = new Set<string>();
    for (const item of [...(primary ?? []), ...(backup ?? [])]) {
      const name = (item?.topic ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(item);
      if (list.length >= 3 && (primary?.length ?? 0) >= 2) {
        // Keep all valid AI items up to 4, or stop once topped up to 2+
        if (list.length >= (primary?.length ?? 0)) break;
      }
    }
    return list;
  };

  return {
    beginner: mergeTier(generated.beginner, fallback.beginner),
    intermediate: mergeTier(generated.intermediate, fallback.intermediate),
    advanced: mergeTier(generated.advanced, fallback.advanced),
  };
}

/**
 * Evaluates a candidate's interview response deterministically against the ideal answer
 * when live AI grading is unavailable.
 */
export function evaluateAnswerFallback(
  question: string,
  userAnswer: string,
  idealAnswer: string
): AnswerFeedback {
  const cleanUser = userAnswer.trim();
  const userWords = extractKeywords(cleanUser);
  const idealWords = extractKeywords(`${question} ${idealAnswer}`);

  let matchedCount = 0;
  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];

  for (const term of idealWords) {
    if (userWords.has(term)) {
      matchedCount += 1;
      matchedTerms.push(term);
    } else {
      missingTerms.push(term);
    }
  }

  const coverageRatio = idealWords.size > 0 ? matchedCount / idealWords.size : 0.5;
  const wordCount = cleanUser.split(/\s+/).filter(Boolean).length;
  const lengthScore = Math.min(30, Math.round((wordCount / 45) * 30));
  const structureBonus =
    /(\bfor example\b|\bbecause\b|\btrade-?off\b|\bfirst\b|\bsecond\b|[-•]|\d+\.)/i.test(
      cleanUser
    )
      ? 12
      : 4;

  const rawScore = Math.round(coverageRatio * 58 + lengthScore + structureBonus);
  const score = Math.max(18, Math.min(96, rawScore));

  const strengths: string[] = [];
  if (matchedTerms.length > 0) {
    strengths.push(
      `Addressed core technical concepts (${matchedTerms.slice(0, 5).join(', ')}).`
    );
  }
  if (wordCount >= 35) {
    strengths.push('Provided a detailed multi-sentence explanation with clear context.');
  } else {
    strengths.push('Delivered a concise, direct initial response.');
  }

  const improvements: string[] = [];
  if (missingTerms.length > 0) {
    improvements.push(
      `Expand on key domain concepts from the reference answer: ${missingTerms
        .slice(0, 5)
        .join(', ')}.`
    );
  }
  if (wordCount < 35) {
    improvements.push(
      'Add a concrete production example or edge-case trade-off to demonstrate practical depth.'
    );
  } else {
    improvements.push(
      'Quantify the operational impact or performance trade-offs of your approach.'
    );
  }

  const detailed_feedback =
    score >= 78
      ? 'Strong, well-structured response that covers the primary technical concepts. Adding one concrete production trade-off or metric will make it stand out even further.'
      : score >= 55
        ? 'Solid foundational answer. To reach senior interview bar, explicitly connect the mechanism to real-world edge cases and incorporate the missing reference terms.'
        : 'Your answer touches on the topic briefly but misses several core technical points. Review the ideal answer and structure your response around mechanism, trade-offs, and a concrete example.';

  return {
    score,
    strengths,
    improvements,
    detailed_feedback,
  };
}

/**
 * Builds a complete Beginner / Intermediate / Advanced study roadmap for any role.
 */
export function buildFallbackStudyPath(
  role: string,
  _level: StudyLevel
): StudyPathMap {
  const cleanRole = role.trim() || 'Software Engineer';
  if (CURATED_STUDY_PATHS[cleanRole]) {
    return CURATED_STUDY_PATHS[cleanRole];
  }

  const mkTopic = (
    topic: string,
    description: string,
    importance: string,
    key_points: string[],
    resources: string[]
  ): StudyTopic => ({
    topic,
    description,
    importance,
    key_points,
    resources,
  });

  return {
    beginner: [
      mkTopic(
        `${cleanRole} Core Fundamentals`,
        `Master the foundational principles, standard workflows, and core abstractions expected of every ${cleanRole}.`,
        'Establishes baseline fluency for technical phone screens.',
        ['Core terminology & mental models', 'Standard tooling & debugging', 'Documentation literacy'],
        ['MDN Web Docs', 'Official Language & Framework Guides', 'Roadmap.sh']
      ),
      mkTopic(
        'Data Structures, Queries & Problem Solving',
        `Understand how data is modeled, queried, transformed, and validated in day-to-day ${cleanRole} work.`,
        'Directly tested in practical coding and analysis rounds.',
        ['Time & space complexity', 'Clean data modeling', 'Edge-case validation'],
        ['NeetCode / LeetCode Patterns', 'PostgreSQL Tutorial', 'Refactoring Guru']
      ),
    ],
    intermediate: [
      mkTopic(
        `${cleanRole} Architecture & API Contracts`,
        `Design modular components, clean interfaces, and resilient failure handling across service boundaries.`,
        'Core focus of mid-level technical design interviews.',
        ['Interface design & versioning', 'Error handling & retries', 'Security & access control'],
        ['OWASP Cheat Sheets', 'Patterns.dev', 'System Design Primer']
      ),
      mkTopic(
        'Testing, Observability & Delivery Pipelines',
        `Build automated unit/integration tests, telemetry dashboards, and reliable CI/CD workflows.`,
        'Demonstrates production engineering maturity.',
        ['Automated test suites', 'Metrics, logs & tracing', 'CI/CD quality gates'],
        ['Google Testing Blog', 'OpenTelemetry Docs', 'GitHub Actions Guides']
      ),
    ],
    advanced: [
      mkTopic(
        `Scalable ${cleanRole} System Design`,
        `Architect high-availability systems handling 10x growth, caching tiers, and operational trade-offs.`,
        'Separates senior and staff candidates in architecture loops.',
        ['Latency & throughput tuning', 'Fault isolation & graceful degradation', 'Cost vs performance'],
        ['Designing Data-Intensive Applications', 'AWS Well-Architected Framework', 'High Scalability']
      ),
      mkTopic(
        'Performance Tuning & Reliability Engineering',
        `Profile bottlenecks, design capacity budgets, and lead incident postmortems for ${cleanRole} systems.`,
        'High-signal topic in senior and staff behavioral-technical rounds.',
        ['Latency percentiles (p95/p99)', 'Load shedding & backpressure', 'Zero-downtime migrations'],
        ['Site Reliability Engineering Book', 'Chrome DevTools / Profiling Guides', 'Cloud Reliability Patterns']
      ),
    ],
  };
}

/**
 * Builds an in-depth topic study guide for the modal deep dive.
 */
export function buildFallbackTopicDetails(
  topic: string,
  role: string
): TopicDetails {
  const cleanTopic = topic.trim() || 'Core Engineering Concept';
  const cleanRole = role.trim() || 'Software Engineer';

  return {
    topic: cleanTopic,
    description: `${cleanTopic} is a high-signal interview area for ${cleanRole} candidates. Interviewers evaluate both your conceptual understanding of how ${cleanTopic} works under the hood and your judgment when applying it to production trade-offs.`,
    key_concepts: [
      `Core mental model and lifecycle of ${cleanTopic}`,
      `Performance, latency, and resource implications in ${cleanRole} workflows`,
      `Security, validation, and failure-handling boundaries for ${cleanTopic}`,
      `Testing and observability strategies to verify ${cleanTopic} in production`,
    ],
    example_problems: [
      `Explain how ${cleanTopic} works to a teammate and contrast it with common alternatives.`,
      `Diagnose and fix a production bottleneck or subtle bug involving ${cleanTopic}.`,
      `Design a scalable ${cleanRole} feature that relies on ${cleanTopic} under high concurrency.`,
    ],
    common_mistakes: [
      `Memorizing definitions of ${cleanTopic} without explaining concrete trade-offs or failure modes.`,
      `Over-engineering with ${cleanTopic} before measuring actual baseline bottlenecks.`,
      `Neglecting error states, edge-case inputs, or cleanup logic.`,
    ],
    resources: [
      {
        name: 'MDN Web Docs & Technical References',
        type: 'documentation',
        url: 'https://developer.mozilla.org/',
      },
      {
        name: 'System Design Primer & Engineering Guides',
        type: 'guide',
        url: 'https://github.com/donnemartin/system-design-primer',
      },
      {
        name: 'Roadmap.sh Interactive Skill Trees',
        type: 'practice',
        url: 'https://roadmap.sh/',
      },
    ],
  };
}

/**
 * Builds a deterministic AI recruiter review for the ATS Checker when the live model is busy.
 */
export function buildFallbackAtsDeepReview(
  resumeText: string,
  jobDescription: string
): AtsDeepReview {
  const ats = analyzeAtsResume(resumeText, jobDescription);
  const opt = buildBaselineOptimization(resumeText, 'Full Stack Developer');

  const strengths: string[] = [];
  if (ats.section_checks.experience && ats.section_checks.skills) {
    strengths.push('Clear, standard section headings that ATS parsers index reliably.');
  }
  if (ats.matched_keywords.length > 0) {
    strengths.push(
      `Strong alignment on core keywords (${ats.matched_keywords.slice(0, 6).join(', ')}).`
    );
  } else {
    strengths.push('Includes direct technical skill callouts and chronological history.');
  }
  if (ats.section_checks.email && ats.section_checks.phone) {
    strengths.push('Complete contact header ready for recruiter outreach.');
  }

  const gaps: string[] = [];
  if (ats.missing_keywords.length > 0) {
    gaps.push(
      `Missing target job description terms: ${ats.missing_keywords.slice(0, 6).join(', ')}.`
    );
  }
  if (!ats.section_checks.projects) {
    gaps.push('No dedicated Projects section to showcase hands-on architecture.');
  }
  gaps.push(
    'Several bullet points can be strengthened by pairing action verbs with quantified metrics (%, ms, scale).'
  );

  return {
    summary:
      ats.score >= 80
        ? `Your resume scores ${ats.score}/100 with strong structural clarity and solid keyword coverage. Tightening measurable outcomes in your top experience bullets will maximize recruiter pass-through.`
        : `Your resume scores ${ats.score}/100 and has room to improve keyword alignment and section completeness before submitting to automated ATS screens.`,
    strengths,
    gaps,
    rewritten_bullets: [
      `${opt.action_verbs[0]} core production workflows using ${
        ats.matched_keywords[0] || 'modern web technologies'
      }, reducing p95 latency by 35% across 25,000+ daily active users.`,
      `${opt.action_verbs[1]} automated CI/CD testing and validation pipelines, cutting release regressions by 40%.`,
      `${opt.action_verbs[2]} cross-functional delivery of customer-facing features from RFC design to monitored rollout.`,
    ],
  };
}
