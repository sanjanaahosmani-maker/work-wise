export type VoiceInterviewType = 'hr' | 'technical' | 'behavioral';
export type VoiceConfidenceLabel = 'Low' | 'Medium' | 'High';

export interface FillerBreakdownItem {
  word: string;
  count: number;
}

export interface SpeechTurnMetrics {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  fillerCount: number;
  fillerBreakdown: FillerBreakdownItem[];
  pauseCount: number;
  longestPauseSeconds: number;
  avgPauseSeconds: number;
  volumeSteadiness: number; // 0-100
}

export interface VoiceGrammarCorrection {
  original: string;
  corrected: string;
  reason: string;
}

export interface VoiceBetterPhrasing {
  original: string;
  improved: string;
}

export interface VoiceQuestionFeedbackItem {
  question: string;
  isFollowUp: boolean;
  userAnswer: string;
  sampleBetterAnswer: string;
  score: number; // 0-100
  keyTakeaway: string;
}

export interface VoiceSessionReport {
  sessionId: string;
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: 'junior' | 'mid' | 'senior';
  createdAt: string;
  completedAt: string;
  durationSeconds: number;
  overallScore: number; // 0-100
  confidence: {
    score: number;
    label: VoiceConfidenceLabel;
    wpm: number;
    fillerCount: number;
    fillerBreakdown: FillerBreakdownItem[];
    avgPauseSeconds: number;
    volumeSteadiness: number;
    notes: string;
  };
  answeringAbility: {
    score: number;
    relevance: number;
    structureClarity: number;
    depthAccuracy: number;
    completeness: number;
    notes: string;
  };
  communicationSkills: {
    score: number;
    clarityFluency: number;
    toneProfessionalism: number;
    conciseness: number;
    notes: string;
  };
  englishKnowledge: {
    score: number;
    vocabularyRange: number;
    sentenceFormation: number;
    grammarCorrections: VoiceGrammarCorrection[];
    betterPhrasings: VoiceBetterPhrasing[];
    notes: string;
  };
  strengths: string[];
  weaknesses: string[];
  questionFeedback: VoiceQuestionFeedbackItem[];
  actionableTips: string[];
  practicePlan: string[];
}

const SINGLE_WORD_FILLERS = ['um', 'uh', 'uhh', 'erm', 'ah', 'like', 'basically', 'actually', 'literally'];
const PHRASE_FILLERS = ['you know', 'kind of', 'sort of', 'i mean'];

export function analyzeFillerWords(transcript: string): {
  total: number;
  breakdown: FillerBreakdownItem[];
} {
  const lower = transcript.toLowerCase();
  if (!lower.trim()) {
    return { total: 0, breakdown: [] };
  }

  const counts = new Map<string, number>();

  for (const phrase of PHRASE_FILLERS) {
    const regex = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      counts.set(phrase, matches.length);
    }
  }

  for (const word of SINGLE_WORD_FILLERS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      counts.set(word, matches.length);
    }
  }

  const breakdown = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const total = breakdown.reduce((sum, item) => sum + item.count, 0);
  return { total, breakdown };
}

export function computeTurnSpeechMetrics(params: {
  transcript: string;
  durationSeconds: number;
  pauseDurationsMs?: number[];
  rmsSamples?: number[];
}): SpeechTurnMetrics {
  const words = params.transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = words.length;
  const safeDuration = Math.max(1, Math.round(params.durationSeconds));
  const wpm = wordCount > 0 ? Math.min(260, Math.round((wordCount / safeDuration) * 60)) : 0;

  const { total: fillerCount, breakdown: fillerBreakdown } = analyzeFillerWords(params.transcript);

  const pauses = (params.pauseDurationsMs ?? []).filter((p) => p >= 500);
  const pauseCount = pauses.length;
  const longestPauseSeconds =
    pauses.length > 0 ? Number((Math.max(...pauses) / 1000).toFixed(1)) : 0;
  const avgPauseSeconds =
    pauses.length > 0
      ? Number((pauses.reduce((s, p) => s + p, 0) / pauses.length / 1000).toFixed(1))
      : 0;

  const rms = (params.rmsSamples ?? []).filter((v) => v > 0.01);
  let volumeSteadiness = 78;
  if (rms.length >= 4) {
    const mean = rms.reduce((s, v) => s + v, 0) / rms.length;
    const variance = rms.reduce((s, v) => s + (v - mean) ** 2, 0) / rms.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0.5;
    volumeSteadiness = Math.max(40, Math.min(98, Math.round(100 - cv * 55)));
  }

  return {
    wordCount,
    durationSeconds: safeDuration,
    wpm,
    fillerCount,
    fillerBreakdown,
    pauseCount,
    longestPauseSeconds,
    avgPauseSeconds,
    volumeSteadiness,
  };
}

export function aggregateVoiceSessionMetrics(turns: SpeechTurnMetrics[]): {
  wpm: number;
  fillerCount: number;
  fillerBreakdown: FillerBreakdownItem[];
  avgPauseSeconds: number;
  volumeSteadiness: number;
  confidenceLabel: VoiceConfidenceLabel;
  baselineConfidenceScore: number;
} {
  if (turns.length === 0) {
    return {
      wpm: 0,
      fillerCount: 0,
      fillerBreakdown: [],
      avgPauseSeconds: 0,
      volumeSteadiness: 75,
      confidenceLabel: 'Medium',
      baselineConfidenceScore: 70,
    };
  }

  const totalWords = turns.reduce((s, t) => s + t.wordCount, 0);
  const totalDuration = Math.max(1, turns.reduce((s, t) => s + t.durationSeconds, 0));
  const wpm = totalWords > 0 ? Math.min(260, Math.round((totalWords / totalDuration) * 60)) : 0;

  const fillerMap = new Map<string, number>();
  let fillerCount = 0;
  for (const t of turns) {
    fillerCount += t.fillerCount;
    for (const item of t.fillerBreakdown) {
      fillerMap.set(item.word, (fillerMap.get(item.word) ?? 0) + item.count);
    }
  }
  const fillerBreakdown = Array.from(fillerMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const avgPauseSeconds = Number(
    (turns.reduce((s, t) => s + t.avgPauseSeconds, 0) / turns.length).toFixed(1)
  );
  const volumeSteadiness = Math.round(
    turns.reduce((s, t) => s + t.volumeSteadiness, 0) / turns.length
  );

  // Score pace (ideal 115-165 WPM), low filler rate, steadiness, low pauses
  const pacePenalty = wpm === 0 ? 25 : wpm < 95 ? (95 - wpm) * 0.45 : wpm > 180 ? (wpm - 180) * 0.35 : 0;
  const fillerRatio = totalWords > 0 ? fillerCount / totalWords : 0;
  const fillerPenalty = Math.min(30, Math.round(fillerRatio * 220));
  const pausePenalty = Math.min(18, Math.round(avgPauseSeconds * 4));
  const steadinessBonus = Math.round((volumeSteadiness - 70) * 0.25);

  const baselineConfidenceScore = Math.max(
    35,
    Math.min(98, Math.round(86 - pacePenalty - fillerPenalty - pausePenalty + steadinessBonus))
  );

  const confidenceLabel: VoiceConfidenceLabel =
    baselineConfidenceScore >= 78 ? 'High' : baselineConfidenceScore >= 58 ? 'Medium' : 'Low';

  return {
    wpm,
    fillerCount,
    fillerBreakdown,
    avgPauseSeconds,
    volumeSteadiness,
    confidenceLabel,
    baselineConfidenceScore,
  };
}

export function buildVoiceSessionReportFallback(params: {
  sessionId: string;
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: 'junior' | 'mid' | 'senior';
  createdAt: string;
  completedAt: string;
  durationSeconds: number;
  turns: Array<{
    question: string;
    isFollowUp: boolean;
    idealAnswer: string;
    userAnswer: string;
    metrics: SpeechTurnMetrics;
  }>;
}): VoiceSessionReport {
  const agg = aggregateVoiceSessionMetrics(params.turns.map((t) => t.metrics));

  const questionFeedback: VoiceQuestionFeedbackItem[] = params.turns.map((turn) => {
    const wordLen = turn.userAnswer.trim().split(/\s+/).filter(Boolean).length;
    const hasStructure = /first|second|because|result|impact|when|then|example|specifically/i.test(
      turn.userAnswer
    );
    const score = Math.max(
      42,
      Math.min(94, 52 + Math.min(28, Math.round(wordLen * 0.55)) + (hasStructure ? 10 : 0) - turn.metrics.fillerCount * 2)
    );
    return {
      question: turn.question,
      isFollowUp: turn.isFollowUp,
      userAnswer: turn.userAnswer || '(No spoken response recorded)',
      sampleBetterAnswer:
        turn.idealAnswer ||
        `Structure your response clearly for a ${params.difficulty}-level ${params.role}: state the context, explain your key reasoning and trade-offs, and close with a concrete outcome.`,
      score,
      keyTakeaway:
        wordLen < 20
          ? 'Expand your answer with specific actions taken and measurable outcomes.'
          : hasStructure
            ? 'Good logical flow—tighten transitions and add one concrete metric.'
            : 'Organize points using Situation, Task, Action, and Result (STAR) or clear trade-offs.',
    };
  });

  const avgAnswerScore =
    questionFeedback.length > 0
      ? Math.round(questionFeedback.reduce((s, q) => s + q.score, 0) / questionFeedback.length)
      : 68;

  const commScore = Math.max(
    45,
    Math.min(96, Math.round((agg.baselineConfidenceScore + avgAnswerScore) / 2))
  );
  const englishScore = Math.max(
    55,
    Math.min(95, Math.round(84 - Math.min(20, agg.fillerCount * 2)))
  );
  const overallScore = Math.round(
    (agg.baselineConfidenceScore + avgAnswerScore + commScore + englishScore) / 4
  );

  const actionableTips: string[] = [];
  if (agg.fillerCount > 2) {
    actionableTips.push(
      `Reduce filler words (detected ${agg.fillerCount}, including ${agg.fillerBreakdown
        .slice(0, 2)
        .map((f) => `"${f.word}"`)
        .join(', ')}) by pausing silently for half a second before starting a sentence.`
    );
  }
  if (agg.wpm > 175) {
    actionableTips.push(
      `Slow down your speaking pace from ${agg.wpm} WPM toward 130–155 WPM so technical details land clearly.`
    );
  } else if (agg.wpm > 0 && agg.wpm < 105) {
    actionableTips.push(
      `Aim to bring your pace up from ${agg.wpm} WPM toward 120–150 WPM with shorter mental transitions.`
    );
  }
  if (params.interviewType === 'behavioral' || params.interviewType === 'hr') {
    actionableTips.push('Use the STAR format (Situation, Task, Action, Result) with one quantified outcome per story.');
  } else {
    actionableTips.push('State your assumptions upfront, compare two trade-offs, and summarize edge cases at the end.');
  }
  actionableTips.push('Practice 60–90 second concise summaries to avoid trailing off at the end of answers.');

  return {
    sessionId: params.sessionId,
    role: params.role,
    interviewType: params.interviewType,
    difficulty: params.difficulty,
    createdAt: params.createdAt,
    completedAt: params.completedAt,
    durationSeconds: params.durationSeconds,
    overallScore,
    confidence: {
      score: agg.baselineConfidenceScore,
      label: agg.confidenceLabel,
      wpm: agg.wpm,
      fillerCount: agg.fillerCount,
      fillerBreakdown: agg.fillerBreakdown,
      avgPauseSeconds: agg.avgPauseSeconds,
      volumeSteadiness: agg.volumeSteadiness,
      notes:
        agg.confidenceLabel === 'High'
          ? 'Steady vocal delivery and natural pacing throughout your spoken answers.'
          : 'Focus on steady breathing and silent pauses instead of filler words to project stronger conviction.',
    },
    answeringAbility: {
      score: avgAnswerScore,
      relevance: Math.min(96, avgAnswerScore + 3),
      structureClarity: Math.max(45, avgAnswerScore - 3),
      depthAccuracy: avgAnswerScore,
      completeness: Math.max(45, avgAnswerScore - 2),
      notes: `Responses addressed the ${params.interviewType} prompts for ${params.role}; deeper examples and measurable outcomes will raise this score.`,
    },
    communicationSkills: {
      score: commScore,
      clarityFluency: commScore,
      toneProfessionalism: Math.min(96, commScore + 4),
      conciseness: Math.max(45, commScore - 2),
      notes: 'Professional tone maintained; keep explanations focused on the core takeaway first.',
    },
    englishKnowledge: {
      score: englishScore,
      vocabularyRange: englishScore,
      sentenceFormation: Math.min(96, englishScore + 2),
      grammarCorrections: [
        {
          original: 'Example spoken phrasing with informal run-on transitions',
          corrected: 'First, I diagnosed the root cause; next, I shipped the fix and verified metrics.',
          reason: 'Breaking run-on clauses into crisp sequential sentences improves spoken clarity.',
        },
      ],
      betterPhrasings: [
        {
          original: 'I kind of worked on making things faster for users.',
          improved: 'I reduced critical API latency by 35%, directly improving user checkout completion.',
        },
      ],
      notes: 'Strong overall comprehension; replace hedged phrases ("kind of", "sort of") with direct action verbs.',
    },
    strengths: [
      `Completed ${params.turns.length} spoken ${params.interviewType} interview prompts for ${params.role}.`,
      `Maintained a ${agg.volumeSteadiness}% vocal volume steadiness score.`,
    ],
    weaknesses: [
      agg.fillerCount > 0
        ? `Detected ${agg.fillerCount} filler words across responses.`
        : 'Opportunity to add deeper quantitative metrics to technical or behavioral examples.',
      'Ensure every answer wraps up with a crisp 1-sentence conclusion.',
    ],
    questionFeedback,
    actionableTips,
    practicePlan: [
      `Session 1: Rehearse 3 ${params.interviewType} questions aiming for 130–150 WPM and zero filler words.`,
      'Session 2: Record 90-second STAR or system-tradeoff drills emphasizing measurable results.',
      `Session 3: Complete a full 5-question ${params.difficulty}-level Voice Assistant mock focusing on follow-up depth.`,
    ],
  };
}
