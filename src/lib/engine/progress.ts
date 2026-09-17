import type { HistoryEntry } from '@/lib/history';
import type { Progress, Round } from '@/lib/types';
import { round1 } from './text';

/** Guest dashboard maths, mirroring `ProgressService.java` but over locally stored interviews. */
export function localProgress(history: HistoryEntry[], weeklyGoal: number): Progress {
  const answered = history.filter(entry => entry.answeredCount > 0);
  const scored = answered.filter(entry => entry.overallScore != null);

  const readinessScores = scored.slice(0, 5).map(entry => entry.overallScore as number);
  let weighted = 0;
  let weights = 0;
  readinessScores.forEach((score, index) => {
    const weight = 5 - index;
    weighted += score * weight;
    weights += weight;
  });
  const readiness = readinessScores.length === 0 ? 0 : Math.round((weighted / weights) * 10);

  const byRound: Record<string, number | null> = { technical: null, project: null, hr: null };
  for (const round of ['technical', 'project', 'hr'] as Round[]) {
    const values = answered
      .map(entry => entry.roundScores?.[round])
      .filter((value): value is number => value != null);
    byRound[round] =
      values.length === 0
        ? null
        : Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10);
  }

  const days = new Set(answered.map(entry => entry.createdAt.slice(0, 10)));
  const today = new Date();
  const isoDay = (date: Date) => date.toISOString().slice(0, 10);
  const practicedToday = days.has(isoDay(today));

  let streakDays = 0;
  const cursor = new Date(today);
  if (!practicedToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(isoDay(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekStart = new Date(today);
  const weekday = (weekStart.getDay() + 6) % 7; // Monday-based
  weekStart.setDate(weekStart.getDate() - weekday);
  weekStart.setHours(0, 0, 0, 0);
  const completed = answered.filter(entry => new Date(entry.createdAt) >= weekStart).length;

  const rubricEntries = answered.map(entry => entry.rubric).filter(rubric => rubric != null);
  const rubricAverage = (key: 'substance' | 'clarity' | 'depth') => {
    const values = rubricEntries
      .map(rubric => rubric?.[key])
      .filter((value): value is number => value != null);
    return values.length === 0
      ? null
      : round1(values.reduce((total, value) => total + value, 0) / values.length);
  };

  return {
    readiness,
    readinessByRound: byRound,
    streakDays,
    practicedToday,
    weekly: { goal: weeklyGoal, completed },
    totals: {
      interviews: history.length,
      answers: answered.reduce((total, entry) => total + entry.answeredCount, 0),
      minutesSpoken: answered.reduce((total, entry) => total + (entry.minutesSpoken ?? 0), 0),
    },
    trend: scored
      .slice(0, 10)
      .reverse()
      .map(entry => ({
        id: entry.id,
        createdAt: entry.createdAt,
        overallScore: entry.overallScore,
        track: entry.track,
      })),
    rubric:
      rubricEntries.length === 0
        ? null
        : {
            substance: rubricAverage('substance'),
            clarity: rubricAverage('clarity'),
            depth: rubricAverage('depth'),
          },
    recent: answered.slice(0, 5).map(entry => ({
      id: entry.id,
      track: entry.track,
      persona: entry.persona,
      status: entry.status,
      headline: entry.headline,
      overallScore: entry.overallScore,
      confidenceDelta: entry.confidenceDelta,
      answeredCount: entry.answeredCount,
      questionCount: entry.questionCount,
      drill: entry.drill,
      createdAt: entry.createdAt,
    })),
  };
}
