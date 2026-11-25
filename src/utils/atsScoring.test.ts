import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAtsResume, extractKeywords } from './atsScoring';
import {
  buildBaselineOptimization,
  categorizeSkills,
  formatDurationSeconds,
  parseResumeMarkdown,
} from './resumeHelpers';

test('extractKeywords filters stop words and short tokens', () => {
  const words = extractKeywords('Experience with React, TypeScript, and SQL for a job.');
  assert.equal(words.has('react'), true);
  assert.equal(words.has('typescript'), true);
  assert.equal(words.has('sql'), true);
  assert.equal(words.has('and'), false);
  assert.equal(words.has('for'), false);
  assert.equal(words.has('job'), false);
});

test('analyzeAtsResume calculates strong score for complete resume matching JD', () => {
  const resume = `
    Alex Rivera
    alex@example.com | +1 415 555 0101
    EXPERIENCE
    Built React TypeScript Node.js PostgreSQL services with Docker.
    EDUCATION
    B.S. Computer Science
    SKILLS
    React, TypeScript, Node.js, PostgreSQL, Docker
    PROJECTS
    Realtime Analytics Dashboard
  `;
  const jd = 'Looking for React TypeScript Node.js PostgreSQL Docker engineer.';
  const result = analyzeAtsResume(resume, jd);

  assert.equal(result.section_checks.experience, true);
  assert.equal(result.section_checks.education, true);
  assert.equal(result.section_checks.skills, true);
  assert.equal(result.section_checks.projects, true);
  assert.equal(result.section_checks.email, true);
  assert.equal(result.section_checks.phone, true);
  assert.ok(result.score >= 85, `Expected high ATS score, got ${result.score}`);
  assert.ok(result.matched_keywords.includes('react'));
  assert.ok(result.matched_keywords.includes('docker'));
});

test('analyzeAtsResume flags missing sections, contact info, and missing JD keywords', () => {
  const resume = 'Built web apps with HTML and CSS.';
  const jd = 'Requires Kubernetes Terraform AWS Python';
  const result = analyzeAtsResume(resume, jd);

  assert.equal(result.section_checks.experience, false);
  assert.equal(result.section_checks.email, false);
  assert.equal(result.keyword_match, 0);
  assert.ok(result.missing_keywords.includes('kubernetes'));
  assert.ok(result.recommendations.length >= 4);
  assert.ok(result.score <= 20, `Expected low ATS score, got ${result.score}`);
});

test('analyzeAtsResume returns null keyword_match when job description is omitted', () => {
  const resume = 'Jane Doe jane@example.com Experience Education Skills Projects';
  const result = analyzeAtsResume(resume, '');
  assert.equal(result.keyword_match, null);
  assert.ok(result.score >= 80);
});

test('categorizeSkills groups languages, frameworks, tools, and other skills', () => {
  const grouped = categorizeSkills('TypeScript, React, Docker, AWS, System Design');
  assert.deepEqual(grouped.languages, ['TypeScript']);
  assert.deepEqual(grouped.frameworks, ['React']);
  assert.deepEqual(grouped.tools, ['Docker', 'AWS']);
  assert.deepEqual(grouped.other, ['System Design']);
});

test('parseResumeMarkdown safely turns markdown into structured blocks', () => {
  const blocks = parseResumeMarkdown(
    '# Jane Doe\njane@example.com | 555-123-4567\n## Work Experience\n- **Led** React migration\nSummary paragraph.'
  );
  assert.equal(blocks[0]?.type, 'h1');
  assert.equal(blocks[0]?.text, 'Jane Doe');
  assert.equal(blocks[1]?.type, 'contact');
  assert.equal(blocks[2]?.type, 'h2');
  assert.equal(blocks[3]?.type, 'bullet');
  assert.equal(blocks[3]?.text, 'Led React migration');
  assert.equal(blocks[4]?.type, 'paragraph');
});

test('buildBaselineOptimization identifies missing role keywords', () => {
  const opt = buildBaselineOptimization('Experienced with React and CSS Grid', 'Frontend Developer');
  assert.equal(opt.keywords.includes('React'), false);
  assert.equal(opt.keywords.includes('TypeScript'), true);
  assert.ok(opt.action_verbs.length > 5);
});

test('formatDurationSeconds formats elapsed timers cleanly', () => {
  assert.equal(formatDurationSeconds(0), '0:00');
  assert.equal(formatDurationSeconds(65), '1:05');
  assert.equal(formatDurationSeconds(612), '10:12');
});

import {
  buildFallbackQuestions,
  buildFallbackStudyPath,
  buildStructuredResumeFallback,
  ensureCompleteStudyPath,
  ensureExactQuestionCount,
  evaluateAnswerFallback,
} from './fallbackGenerators';

test('buildFallbackQuestions returns exact requested count for any role and domain', () => {
  const questions = buildFallbackQuestions('DevOps Engineer', 'senior', 'Kubernetes & AWS', 6);
  assert.equal(questions.length, 6);
  assert.ok(questions[0]?.question.length > 10);
  assert.ok(questions[0]?.ideal_answer.length > 20);
  assert.ok(questions[0]?.key_points.length >= 2);
});

test('ensureExactQuestionCount tops up sparse AI arrays to exact requested count', () => {
  const sparse = [
    {
      question: 'Single AI question?',
      ideal_answer: 'Detailed answer.',
      key_points: ['Point A'],
      evaluation_criteria: ['Criteria A'],
    },
  ];
  const result3 = ensureExactQuestionCount(sparse, 'Frontend Developer', 'mid', 'React', 3);
  assert.equal(result3.length, 3);
  assert.equal(result3[0]?.question, 'Single AI question?');

  const result2 = ensureExactQuestionCount(sparse, 'Backend Developer', 'senior', 'APIs', 2);
  assert.equal(result2.length, 2);
});

test('ensureCompleteStudyPath guarantees multiple topics per tier', () => {
  const sparsePath = {
    beginner: [{ topic: 'Only One', description: 'Desc', importance: 'Imp', key_points: ['A'], resources: ['B'] }],
    intermediate: [],
    advanced: [],
  };
  const completed = ensureCompleteStudyPath(sparsePath, 'DevOps Engineer', 'intermediate');
  assert.ok((completed.beginner?.length ?? 0) >= 2);
  assert.ok((completed.intermediate?.length ?? 0) >= 2);
  assert.ok((completed.advanced?.length ?? 0) >= 2);
});

test('evaluateAnswerFallback scores comprehensive answers higher than sparse ones', () => {
  const q = 'What is the difference between let, const, and var in JavaScript?';
  const ideal =
    'var is function-scoped and hoisted, while let and const are block-scoped in the temporal dead zone. const prevents reassignment.';
  const strong = evaluateAnswerFallback(
    q,
    'In JavaScript, var is function-scoped and hoisted to the top of its scope, whereas let and const are block-scoped and remain in the temporal dead zone until declared. For example, const prevents variable reassignment while still allowing object property mutation.',
    ideal
  );
  const weak = evaluateAnswerFallback(q, 'They declare variables.', ideal);
  assert.ok(strong.score > weak.score, `Expected ${strong.score} > ${weak.score}`);
  assert.ok(strong.strengths.length >= 1);
  assert.ok(strong.improvements.length >= 1);
});

test('buildFallbackStudyPath and buildStructuredResumeFallback produce complete outputs', () => {
  const path = buildFallbackStudyPath('Cloud Architect', 'advanced');
  assert.ok((path.beginner?.length ?? 0) >= 2);
  assert.ok((path.intermediate?.length ?? 0) >= 2);
  assert.ok((path.advanced?.length ?? 0) >= 2);

  const md = buildStructuredResumeFallback({
    name: 'Priya Nair',
    email: 'priya@example.com',
    phone: '555-0194',
    target_role: 'Full Stack Developer',
    education: 'B.S. Computer Science',
    experience: 'Built React and Node.js services',
    skills: 'TypeScript, React, Node.js, Docker',
    projects: 'Realtime Dashboard',
    certifications: 'AWS Certified',
  });
  assert.ok(md.includes('# Priya Nair'));
  assert.ok(md.includes('## Work Experience'));
  assert.ok(md.includes('## Technical Skills'));
});

import {
  buildSafeResumeFilename,
  getSupportedExtension,
  isSupportedResumeExtension,
  markdownToPlainText,
  stripHtmlToText,
  stripRtfToText,
} from './fileParsing';
import { extractResumeTextFromBase64, FileExtractionError } from '../../server/resumeExtractor';

test('fileParsing validates extensions, builds safe filenames, and converts formats', () => {
  assert.equal(getSupportedExtension('My.Resume.PDF'), '.pdf');
  assert.equal(isSupportedResumeExtension('.pdf'), true);
  assert.equal(isSupportedResumeExtension('.docx'), true);
  assert.equal(isSupportedResumeExtension('.exe'), false);
  assert.equal(buildSafeResumeFilename('Priya Nair!', 'pdf'), 'priya-nair-resume.pdf');
  assert.equal(buildSafeResumeFilename('', 'docx'), 'resume-resume.docx');

  const plain = markdownToPlainText('# Priya Nair\n## Work Experience\n- **Led** migration');
  assert.ok(plain.includes('Priya Nair'));
  assert.ok(plain.includes('WORK EXPERIENCE'));
  assert.ok(plain.includes('• Led migration'));

  const htmlText = stripHtmlToText('<html><body><h1>Jane Doe</h1><p>React &amp; TypeScript</p></body></html>');
  assert.equal(htmlText, 'Jane Doe\nReact & TypeScript');

  const rtfText = stripRtfToText('{\\rtf1\\ansi Jane Doe\\par Senior Engineer}');
  assert.equal(rtfText, 'Jane Doe\nSenior Engineer');
});

test('extractResumeTextFromBase64 extracts text from real PDF, DOCX, HTML, RTF, and TXT files', async () => {
  // 1. TXT
  const txtRes = await extractResumeTextFromBase64(
    'resume.txt',
    Buffer.from('Alex Rivera\nExperience: TypeScript Engineer', 'utf8').toString('base64')
  );
  assert.equal(txtRes.fileType, 'TXT');
  assert.ok(txtRes.text.includes('TypeScript Engineer'));

  // 2. HTML
  const htmlRes = await extractResumeTextFromBase64(
    'resume.html',
    Buffer.from('<h1>Alex Rivera</h1><p>Docker &amp; Kubernetes</p>', 'utf8').toString('base64')
  );
  assert.equal(htmlRes.fileType, 'HTML');
  assert.ok(htmlRes.text.includes('Docker & Kubernetes'));

  // 3. Real PDF generated by jsPDF
  const { jsPDF } = await import('jspdf');
  const pdfDoc = new jsPDF();
  pdfDoc.text('Priya Nair Senior Full Stack Engineer', 20, 20);
  const pdfArrayBuffer = pdfDoc.output('arraybuffer');
  const pdfBase64 = Buffer.from(pdfArrayBuffer).toString('base64');
  const pdfRes = await extractResumeTextFromBase64('priya-resume.pdf', pdfBase64);
  assert.equal(pdfRes.fileType, 'PDF');
  assert.ok(pdfRes.text.includes('Priya Nair'));

  // 4. Real DOCX generated by docx
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const wordDoc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun('Priya Nair PostgreSQL Docker')] })] }],
  });
  const docxBuffer = await Packer.toBuffer(wordDoc);
  const docxRes = await extractResumeTextFromBase64('priya-resume.docx', docxBuffer.toString('base64'));
  assert.equal(docxRes.fileType, 'DOCX');
  assert.ok(docxRes.text.includes('PostgreSQL Docker'));

  // 5. Rejects unsupported legacy .doc cleanly
  await assert.rejects(
    () => extractResumeTextFromBase64('old-resume.doc', Buffer.from('abc').toString('base64')),
    (err: unknown) => err instanceof FileExtractionError && err.message.includes('Legacy .doc')
  );
});

import { buildPracticeTrendSeries } from './practiceTrends';

test('buildPracticeTrendSeries generates weekly mock trend series incorporating live stats', () => {
  const baseline = buildPracticeTrendSeries(0, 0);
  assert.equal(baseline.length, 6);
  assert.equal(baseline[0]?.period, 'Week 1');
  assert.equal(baseline[5]?.period, 'This Week');

  const updated = buildPracticeTrendSeries(5, 2);
  assert.equal(updated[5]?.questionsPracticed, (baseline[5]?.questionsPracticed ?? 0) + 5);
  assert.equal(updated[5]?.mockSessionsCompleted, (baseline[5]?.mockSessionsCompleted ?? 0) + 2);
});

import crypto from 'node:crypto';
import {
  aggregateVoiceSessionMetrics,
  analyzeFillerWords,
  buildVoiceSessionReportFallback,
  computeTurnSpeechMetrics,
} from './voiceMetrics';
import {
  appendVoiceQuestionTurn,
  completeVoiceSession,
  createVoiceSession,
  getVoiceSession,
  listCompletedVoiceReports,
  recordVoiceAnswerTurn,
} from '../../server/voiceSessionStore';

test('analyzeFillerWords and computeTurnSpeechMetrics measure pace, fillers, pauses, and steadiness', () => {
  const fillerResult = analyzeFillerWords('Um I basically used React and you know like improved speed uh twice.');
  assert.equal(fillerResult.total, 5);
  assert.ok(fillerResult.breakdown.some((b) => b.word === 'you know' && b.count === 1));
  assert.ok(fillerResult.breakdown.some((b) => b.word === 'um' && b.count === 1));

  const metrics = computeTurnSpeechMetrics({
    transcript: 'First I profiled PostgreSQL queries and added composite indexes which reduced p95 latency by forty percent.',
    durationSeconds: 8,
    pauseDurationsMs: [650, 1200],
    rmsSamples: [0.32, 0.34, 0.31, 0.35, 0.33],
  });
  assert.equal(metrics.wordCount, 16);
  assert.equal(metrics.wpm, 120);
  assert.equal(metrics.fillerCount, 0);
  assert.equal(metrics.pauseCount, 2);
  assert.equal(metrics.longestPauseSeconds, 1.2);
  assert.ok(metrics.volumeSteadiness >= 85);

  const agg = aggregateVoiceSessionMetrics([metrics]);
  assert.equal(agg.confidenceLabel, 'High');
  assert.ok(agg.baselineConfidenceScore >= 78);
});

test('buildVoiceSessionReportFallback and SQLite voiceSessionStore persist and reload sessions', () => {
  const metrics = computeTurnSpeechMetrics({
    transcript: 'I led the API gateway migration because latency was hurting conversion, resulting in 35% faster checkout.',
    durationSeconds: 10,
  });
  const sid = `test-voice-${crypto.randomUUID()}`;
  createVoiceSession({
    id: sid,
    role: 'Backend Developer',
    interviewType: 'behavioral',
    difficulty: 'senior',
    targetQuestions: 5,
    consentGranted: true,
    saveRawAudio: false,
    firstQuestion: 'Tell me about a high-impact migration you led.',
    firstIdealAnswer: 'Describe context, action, and measurable impact.',
  });
  recordVoiceAnswerTurn({
    sessionId: sid,
    turnIndex: 0,
    userAnswer: 'I led the API gateway migration because latency was hurting conversion, resulting in 35% faster checkout.',
    metrics,
    hasAudio: false,
  });
  appendVoiceQuestionTurn({
    sessionId: sid,
    turnIndex: 1,
    question: 'What trade-offs did you consider during cutover?',
    idealAnswer: 'Explain canary vs blue-green rollout.',
    isFollowUp: true,
  });
  recordVoiceAnswerTurn({
    sessionId: sid,
    turnIndex: 1,
    userAnswer: 'We ran a gradual 5% canary rollout with automated rollback thresholds.',
    metrics,
    hasAudio: false,
  });

  const loaded = getVoiceSession(sid);
  assert.ok(loaded);
  assert.equal(loaded.turns.length, 2);
  assert.equal(loaded.turns[1]?.isFollowUp, true);

  const report = buildVoiceSessionReportFallback({
    sessionId: sid,
    role: loaded.role,
    interviewType: loaded.interviewType,
    difficulty: loaded.difficulty,
    createdAt: loaded.createdAt,
    completedAt: new Date().toISOString(),
    durationSeconds: 45,
    turns: loaded.turns.map((t) => ({
      question: t.question,
      isFollowUp: t.isFollowUp,
      idealAnswer: t.idealAnswer,
      userAnswer: t.userAnswer ?? '',
      metrics: t.metrics ?? metrics,
    })),
  });
  assert.ok(report.overallScore > 0);
  assert.equal(report.questionFeedback.length, 2);
  assert.ok(report.practicePlan.length >= 3);

  completeVoiceSession(sid, report);
  const history = listCompletedVoiceReports(50);
  assert.ok(history.some((r) => r.sessionId === sid));
});




