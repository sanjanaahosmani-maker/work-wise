export interface PracticeTrendPoint {
  period: string;
  questionsPracticed: number;
  mockSessionsCompleted: number;
}

const BASELINE_MOCK_TRENDS: PracticeTrendPoint[] = [
  { period: 'Week 1', questionsPracticed: 6, mockSessionsCompleted: 1 },
  { period: 'Week 2', questionsPracticed: 11, mockSessionsCompleted: 2 },
  { period: 'Week 3', questionsPracticed: 9, mockSessionsCompleted: 2 },
  { period: 'Week 4', questionsPracticed: 15, mockSessionsCompleted: 3 },
  { period: 'Week 5', questionsPracticed: 18, mockSessionsCompleted: 4 },
];

export function buildPracticeTrendSeries(
  currentQuestionsPracticed: number,
  currentMockSessionsCompleted: number
): PracticeTrendPoint[] {
  const safeQuestions = Math.max(0, Math.round(currentQuestionsPracticed));
  const safeMocks = Math.max(0, Math.round(currentMockSessionsCompleted));

  return [
    ...BASELINE_MOCK_TRENDS,
    {
      period: 'This Week',
      questionsPracticed: 14 + safeQuestions,
      mockSessionsCompleted: 3 + safeMocks,
    },
  ];
}
