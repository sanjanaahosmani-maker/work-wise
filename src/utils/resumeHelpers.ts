import type { ResumeFormData, ResumeOptimization } from '../types';

const FRAMEWORK_KEYWORDS = [
  'react', 'vue', 'angular', 'next', 'node', 'express', 'django', 'flask',
  'fastapi', 'spring', 'tailwind', 'svelte', 'tensorflow', 'pytorch', 'pandas',
];

const TOOL_KEYWORDS = [
  'docker', 'kubernetes', 'git', 'sql', 'postgres', 'postgresql', 'mongodb',
  'redis', 'aws', 'gcp', 'azure', 'ci/cd', 'jenkins', 'terraform', 'linux',
  'figma', 'tableau', 'power bi', 'graphql', 'rest',
];

const LANGUAGE_KEYWORDS = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'golang',
  'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'html', 'css',
];

export const ROLE_KEYWORDS: Record<string, string[]> = {
  'frontend developer': ['React', 'TypeScript', 'CSS Grid', 'Accessibility', 'Core Web Vitals', 'REST APIs', 'Testing'],
  'backend developer': ['Node.js', 'Python', 'PostgreSQL', 'REST APIs', 'Docker', 'Caching', 'Authentication'],
  'full stack developer': ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD', 'REST APIs'],
  'data scientist': ['Python', 'Machine Learning', 'Statistics', 'PyTorch', 'Feature Engineering', 'A/B Testing', 'SQL'],
  'data analyst': ['SQL', 'Python', 'Tableau', 'Power BI', 'Statistics', 'Cohort Analysis', 'Data Cleaning'],
  'devops engineer': ['Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'AWS', 'Monitoring', 'Linux'],
  'cloud architect': ['AWS', 'GCP', 'IAM', 'Terraform', 'High Availability', 'Networking', 'Cost Optimization'],
  'machine learning engineer': ['PyTorch', 'MLOps', 'Docker', 'Python', 'Model Serving', 'Distributed Training', 'Evaluation'],
  'product manager': ['Roadmapping', 'KPIs', 'A/B Testing', 'User Research', 'SQL', 'Prioritization', 'Go-to-Market'],
  'ui/ux designer': ['Figma', 'Design Systems', 'Prototyping', 'Usability Testing', 'WCAG Accessibility', 'Wireframing'],
  'qa engineer': ['Playwright', 'Cypress', 'Automated Testing', 'CI/CD', 'API Testing', 'Regression Suites'],
  'security engineer': ['OWASP', 'Threat Modeling', 'IAM', 'SIEM', 'Penetration Testing', 'Cloud Security'],
};

export const ACTION_VERBS = [
  'Architected', 'Engineered', 'Optimized', 'Implemented', 'Automated',
  'Spearheaded', 'Reduced', 'Accelerated', 'Designed', 'Collaborated',
  'Launched', 'Migrated', 'Streamlined', 'Mentored', 'Delivered',
];

export function categorizeSkills(skillsText: string): {
  languages: string[];
  frameworks: string[];
  tools: string[];
  other: string[];
} {
  const items = skillsText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const languages: string[] = [];
  const frameworks: string[] = [];
  const tools: string[] = [];
  const other: string[] = [];

  for (const skill of items) {
    const lower = skill.toLowerCase();
    if (FRAMEWORK_KEYWORDS.some((kw) => lower.includes(kw))) {
      frameworks.push(skill);
    } else if (TOOL_KEYWORDS.some((kw) => lower.includes(kw))) {
      tools.push(skill);
    } else if (LANGUAGE_KEYWORDS.some((kw) => lower === kw || lower.startsWith(`${kw} `))) {
      languages.push(skill);
    } else {
      other.push(skill);
    }
  }

  return { languages, frameworks, tools, other };
}

export function buildBaselineOptimization(
  resumeText: string,
  targetRole: string
): ResumeOptimization {
  const lower = resumeText.toLowerCase();
  const roleKey = targetRole.trim().toLowerCase();
  const expected = ROLE_KEYWORDS[roleKey] ?? ROLE_KEYWORDS['full stack developer'];
  const missingKeywords = expected.filter((kw) => !lower.includes(kw.toLowerCase()));

  const improvements: string[] = [
    'Quantify achievements with concrete metrics (latency reductions, user growth, revenue or time saved).',
    'Lead every experience bullet with a high-impact action verb rather than passive responsibilities.',
    `Tailor your summary and top bullets directly to ${targetRole || 'your target role'} requirements.`,
    'Keep formatting single-column with clear standard headings for reliable ATS parsing.',
  ];

  return {
    keywords: missingKeywords.length > 0 ? missingKeywords : expected.slice(0, 5),
    action_verbs: ACTION_VERBS,
    improvements,
  };
}

export interface ResumeBlock {
  type: 'h1' | 'h2' | 'h3' | 'bullet' | 'paragraph' | 'contact';
  text: string;
}

/**
 * Safely parses generated markdown resume text into structured React-renderable blocks
 * without using dangerouslySetInnerHTML.
 */
export function parseResumeMarkdown(markdown: string): ResumeBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ResumeBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---' || line === '***') continue;

    const cleanInline = (s: string) =>
      s
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1');

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: cleanInline(line.slice(4).trim()) });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: cleanInline(line.slice(3).trim()) });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: cleanInline(line.slice(2).trim()) });
    } else if (/^[-*•]\s+/.test(line)) {
      blocks.push({ type: 'bullet', text: cleanInline(line.replace(/^[-*•]\s+/, '').trim()) });
    } else if (blocks.length <= 2 && (line.includes('@') || line.includes('|'))) {
      blocks.push({ type: 'contact', text: cleanInline(line) });
    } else {
      blocks.push({ type: 'paragraph', text: cleanInline(line) });
    }
  }

  return blocks;
}

export function formatResumeHeader(profile: ResumeFormData): string {
  const contactParts = [profile.email.trim(), profile.phone.trim()].filter(Boolean);
  return `# ${profile.name.trim()}\n${contactParts.join(' | ')}`;
}

export function formatDurationSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
