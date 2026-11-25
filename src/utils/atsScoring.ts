import type { AtsAnalysisResult } from '../types';

const STOP_WORDS = new Set([
  'and', 'the', 'with', 'for', 'from', 'you', 'your', 'our', 'that', 'this',
  'are', 'will', 'have', 'has', 'was', 'were', 'role', 'work', 'job', 'team',
  'who', 'can', 'all', 'not', 'but', 'into', 'over', 'such', 'using', 'build',
  'experience', 'years', 'strong', 'knowledge', 'familiarity', 'requirements',
  'hiring', 'looking', 'modern', 'products', 'company', 'candidate', 'ability',
  'preferred', 'including', 'plus', 'based', 'level', 'must', 'about', 'other',
]);

export function extractKeywords(text: string): Set<string> {
  const matches = text.toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) ?? [];
  const result = new Set<string>();
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,-]+$/g, '');
    if (cleaned.length >= 3 && !STOP_WORDS.has(cleaned)) {
      result.add(cleaned);
    }
  }
  return result;
}

export function analyzeAtsResume(
  resumeText: string,
  jobDescription = ''
): AtsAnalysisResult {
  const trimmedResume = resumeText.trim();
  const trimmedJob = jobDescription.trim();

  const resumeWords = extractKeywords(trimmedResume);
  const jobWords = trimmedJob ? extractKeywords(trimmedJob) : new Set<string>();

  const matched = Array.from(jobWords)
    .filter((word) => resumeWords.has(word))
    .sort();
  const missing = Array.from(jobWords)
    .filter((word) => !resumeWords.has(word))
    .sort();

  const keywordMatch =
    jobWords.size > 0 ? Math.round((matched.length / jobWords.size) * 100) : null;
  const keywordScore = keywordMatch !== null ? keywordMatch : 70;

  const lowerResume = trimmedResume.toLowerCase();
  const hasExperience = /\bexperience\b/.test(lowerResume);
  const hasEducation = /\beducation\b/.test(lowerResume);
  const hasSkills = /\bskills\b/.test(lowerResume);
  const hasProjects = /\bprojects\b/.test(lowerResume);
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(trimmedResume);
  const hasPhone = /\+?[0-9][0-9 ().-]{7,}[0-9]/.test(trimmedResume);

  const sectionScore =
    (hasExperience ? 12 : 0) +
    (hasEducation ? 12 : 0) +
    (hasSkills ? 12 : 0) +
    (hasProjects ? 12 : 0);

  const contactScore = (hasEmail ? 12 : 0) + (hasPhone ? 8 : 0);

  // Faithful weighted formula from the original suite (clamped 0-100)
  const score = Math.max(
    0,
    Math.min(100, Math.round(keywordScore * 0.55 + sectionScore + contactScore))
  );

  const recommendations: string[] = [];
  if (missing.length > 0) {
    recommendations.push(
      `Incorporate relevant target keywords naturally: ${missing.slice(0, 8).join(', ')}.`
    );
  }
  if (!hasExperience) {
    recommendations.push('Include a clearly labeled Experience section with dates and measurable impact.');
  }
  if (!hasEducation) {
    recommendations.push('Include a clearly labeled Education section.');
  }
  if (!hasSkills) {
    recommendations.push('Add a dedicated Skills section grouped by languages, frameworks, and tools.');
  }
  if (!hasProjects) {
    recommendations.push('Add a Projects section highlighting concrete technical deliverables.');
  }
  if (!hasEmail) {
    recommendations.push('Add a professional email address at the top of your resume.');
  }
  if (!hasPhone) {
    recommendations.push('Include a reachable phone number in your contact header.');
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'Your resume structure is ATS-friendly. Strengthen impact by quantifying achievements with percentages, latency gains, or user scale.'
    );
  }

  return {
    score,
    keyword_match: keywordMatch,
    matched_keywords: matched.slice(0, 24),
    missing_keywords: missing.slice(0, 24),
    recommendations,
    section_checks: {
      experience: hasExperience,
      education: hasEducation,
      skills: hasSkills,
      projects: hasProjects,
      email: hasEmail,
      phone: hasPhone,
    },
  };
}
