import type { Round, Track } from '@/lib/types';

/**
 * Which round each question belongs to. A full loop opens and closes with HR questions and spends the
 * middle on technical and project work. Mirrors `RoundPlanner.java`.
 */
const MIXED_PATTERNS: Record<number, string> = {
  3: 'HTP',
  4: 'HTTP',
  5: 'HTTPH',
  6: 'HTTPPH',
  7: 'HTTTPPH',
  8: 'HTTTPPTH',
};

export function planRounds(track: Track, questionCount: number, hasProject: boolean): Round[] {
  if (track === 'technical') return Array.from({ length: questionCount }, () => 'technical' as const);
  if (track === 'project') return Array.from({ length: questionCount }, () => 'project' as const);
  if (track === 'hr') return Array.from({ length: questionCount }, () => 'hr' as const);

  const pattern = MIXED_PATTERNS[questionCount];
  if (!pattern) {
    throw new Error(`A full loop needs 3 to 8 questions, got ${questionCount}`);
  }
  return [...pattern].map(symbol =>
    symbol === 'H' ? 'hr' : symbol === 'T' ? 'technical' : hasProject ? 'project' : 'technical',
  );
}

export function defaultRound(track: Track): Round {
  if (track === 'project') return 'project';
  if (track === 'hr') return 'hr';
  return 'technical';
}
