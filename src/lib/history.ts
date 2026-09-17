import type { InterviewStatus, Persona, Round, RubricAverages, Scorecard, Track } from '@/lib/types';
import { KEYS, readJson, writeJson } from './storage';

/**
 * A local index of interviews taken on this device. It powers the guest dashboard and lets a new
 * account claim the interviews someone took before signing up.
 */
export interface HistoryEntry {
  id: string;
  /** `api` interviews live on the server and can be claimed; `local` ones only exist in this browser. */
  source: 'api' | 'local';
  track: Track;
  persona: Persona;
  headline: string;
  status: InterviewStatus;
  questionCount: number;
  answeredCount: number;
  overallScore: number | null;
  confidenceDelta: number | null;
  drill: boolean;
  createdAt: string;
  roundScores?: Partial<Record<Round, number>>;
  rubric?: RubricAverages | null;
  minutesSpoken?: number;
}

const MAX_ENTRIES = 60;

export function listHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(KEYS.history, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function upsertHistory(entry: HistoryEntry): void {
  const existing = readJson<HistoryEntry[]>(KEYS.history, []);
  const index = existing.findIndex(item => item.id === entry.id);
  if (index >= 0) {
    existing[index] = { ...existing[index], ...entry };
  } else {
    existing.unshift(entry);
  }
  const trimmed = existing
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ENTRIES);
  writeJson(KEYS.history, trimmed);
}

export function removeHistory(id: string): void {
  writeJson(
    KEYS.history,
    readJson<HistoryEntry[]>(KEYS.history, []).filter(entry => entry.id !== id),
  );
}

export function clearHistory(): void {
  writeJson(KEYS.history, []);
}

/** Server-side interviews taken as a guest, which a fresh account can claim. */
export function claimableIds(): string[] {
  return listHistory()
    .filter(entry => entry.source === 'api')
    .map(entry => entry.id)
    .slice(0, 50);
}

/** Records everything the dashboard needs from a finished scorecard. */
export function rememberScorecard(scorecard: Scorecard, source: 'api' | 'local'): void {
  const roundScores: Partial<Record<Round, number>> = {};
  for (const round of ['technical', 'project', 'hr'] as Round[]) {
    const scores = scorecard.turns
      .filter(turn => turn.round === round && turn.answered && turn.score != null)
      .map(turn => turn.score as number);
    if (scores.length > 0) {
      roundScores[round] = scores.reduce((total, score) => total + score, 0) / scores.length;
    }
  }

  upsertHistory({
    id: scorecard.id,
    source,
    track: scorecard.track,
    persona: scorecard.persona,
    headline: scorecard.headline,
    status: scorecard.status,
    questionCount: scorecard.questionCount,
    answeredCount: scorecard.answeredCount,
    overallScore: scorecard.overallScore,
    confidenceDelta: scorecard.confidenceDelta,
    drill: scorecard.drill,
    createdAt: scorecard.createdAt,
    roundScores,
    rubric: scorecard.rubric,
    minutesSpoken: Math.round(scorecard.speech.speakingSeconds / 60),
  });
}
