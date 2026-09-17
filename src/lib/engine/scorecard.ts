import type { InterviewSummary, RubricAverages, Scorecard, TurnReview } from '@/lib/types';
import { bank } from './bank';
import type { LocalInterview, LocalTurn } from './model';
import { fill, round1 } from './text';

/** Scorecard assembly. Mirrors `ScorecardAssembler.java`. */

const MAX_NOTES = 3;

export function turnWpm(turn: LocalTurn): number | null {
  const spoken = turn.inputMode === 'voice' || turn.inputMode === 'mixed';
  if (
    !turn.answered ||
    turn.skipped ||
    turn.wordCount == null ||
    turn.speakingSeconds == null ||
    turn.speakingSeconds < 5 ||
    !spoken
  ) {
    return null;
  }
  return Math.round(turn.wordCount / (turn.speakingSeconds / 60));
}

export function overallScoreOf(turns: LocalTurn[]): number | null {
  const scored = turns.filter(turn => turn.answered && turn.score != null);
  if (scored.length === 0) {
    return null;
  }
  return round1(scored.reduce((total, turn) => total + (turn.score ?? 0), 0) / scored.length);
}

export function bandFor(overall: number | null): string {
  if (overall == null) {
    return 'Not scored yet';
  }
  const band = [...bank.coach.report.bands]
    .sort((a, b) => b.min - a.min)
    .find(entry => overall >= entry.min);
  return band?.label ?? 'Needs more reps';
}

export function buildScorecard(interview: LocalInterview): Scorecard {
  const turns = [...interview.turns].sort((a, b) => a.index - b.index);
  const answered = turns.filter(turn => turn.answered);
  const attempted = answered.filter(turn => !turn.skipped);

  const rubric: RubricAverages | null =
    attempted.length === 0
      ? null
      : {
          substance: average(attempted, turn => turn.substance),
          clarity: average(attempted, turn => turn.clarity),
          depth: average(attempted, turn => turn.depth),
        };

  const spoken = attempted.filter(turn => turnWpm(turn) != null);
  const avgWpm =
    spoken.length === 0
      ? null
      : Math.round(sum(spoken, t => t.wordCount) / (sum(spoken, t => t.speakingSeconds) / 60));
  const fillerCount = sum(answered, t => t.fillerCount);
  const overall = overallScoreOf(turns);
  const delta = interview.postConfidence == null ? null : interview.postConfidence - interview.preConfidence;

  return {
    id: interview.id,
    track: interview.track,
    persona: interview.persona,
    status: interview.status,
    headline: interview.headline,
    role: interview.role,
    topic: interview.topic,
    projectName: interview.projectName,
    drill: interview.drill,
    sourceInterviewId: interview.sourceInterviewId,
    questionCount: interview.questionCount,
    answeredCount: interview.answeredCount,
    endedEarly: interview.endedEarly,
    preConfidence: interview.preConfidence,
    postConfidence: interview.postConfidence,
    confidenceDelta: delta,
    reflection: interview.reflection,
    overallScore: overall,
    band: bandFor(overall),
    rubric,
    speech: {
      avgWpm,
      fillerCount,
      totalWords: sum(answered, t => t.wordCount),
      speakingSeconds: sum(answered, t => t.speakingSeconds),
    },
    highlights: highlightsFor(attempted, rubric, spoken.length, avgWpm, fillerCount, delta),
    focusAreas: focusAreasFor(turns, answered, rubric, avgWpm, fillerCount, delta),
    turns: turns.map(toReview),
    owned: false,
    engine: 'offline',
    createdAt: interview.createdAt,
    finishedAt: interview.finishedAt,
  };
}

export function toSummary(interview: LocalInterview): InterviewSummary {
  return {
    id: interview.id,
    track: interview.track,
    persona: interview.persona,
    status: interview.status,
    headline: interview.headline,
    overallScore: interview.overallScore,
    confidenceDelta:
      interview.postConfidence == null ? null : interview.postConfidence - interview.preConfidence,
    answeredCount: interview.answeredCount,
    questionCount: interview.questionCount,
    drill: interview.drill,
    createdAt: interview.createdAt,
  };
}

function toReview(turn: LocalTurn): TurnReview {
  return {
    index: turn.index,
    round: turn.round,
    tier: turn.tier,
    question: turn.question,
    answered: turn.answered,
    answer: turn.answer,
    skipped: turn.skipped,
    hintUsed: turn.hintUsed,
    hint: turn.hint,
    score: turn.score,
    rubric: turn.answered
      ? { substance: turn.substance ?? 0, clarity: turn.clarity ?? 0, depth: turn.depth ?? 0 }
      : null,
    feedback: turn.feedback,
    tip: turn.tip,
    outline: turn.outline,
    evaluatedBy: turn.evaluatedBy,
    wordCount: turn.wordCount,
    fillerCount: turn.fillerCount,
    speakingSeconds: turn.speakingSeconds,
    durationSeconds: turn.durationSeconds,
    inputMode: turn.inputMode,
    wpm: turnWpm(turn),
  };
}

function highlightsFor(
  attempted: LocalTurn[],
  rubric: RubricAverages | null,
  spokenCount: number,
  avgWpm: number | null,
  fillerCount: number,
  delta: number | null,
): string[] {
  const text = bank.coach.report.highlights;
  const notes: string[] = [];

  let best: LocalTurn | null = null;
  for (const turn of attempted) {
    if (turn.score != null && (best == null || turn.score > (best.score ?? 0))) {
      best = turn;
    }
  }
  if (best && (best.score ?? 0) >= 7) {
    notes.push(fill(text.bestAnswer, { index: String(best.index), score: String(best.score) }));
  }
  if (rubric) {
    const strongest = strongestDimension(rubric);
    if (dimensionValue(rubric, strongest) >= 6.5) {
      notes.push(text.strength[strongest]);
    }
  }
  if (avgWpm != null && avgWpm >= 110 && avgWpm <= 165) {
    notes.push(fill(text.pace, { wpm: String(avgWpm) }));
  }
  if (spokenCount > 0 && fillerCount === 0) {
    notes.push(text.noFillers);
  }
  if (delta != null && delta > 0) {
    notes.push(fill(text.confidenceUp, { delta: String(delta) }));
  }
  if (notes.length === 0) {
    notes.push(bank.coach.report.empty.highlight);
  }
  return notes.slice(0, MAX_NOTES);
}

function focusAreasFor(
  turns: LocalTurn[],
  answered: LocalTurn[],
  rubric: RubricAverages | null,
  avgWpm: number | null,
  fillerCount: number,
  delta: number | null,
): string[] {
  const text = bank.coach.report.focus;
  const notes: string[] = [];

  if (rubric) {
    const weakest = weakestDimension(rubric);
    if (dimensionValue(rubric, weakest) < 7.5) {
      notes.push(text.weakness[weakest]);
    }
  }
  if (avgWpm != null) {
    if (avgWpm > 165) {
      notes.push(fill(text.fast, { wpm: String(avgWpm) }));
    } else if (avgWpm < 110) {
      notes.push(fill(text.slow, { wpm: String(avgWpm) }));
    }
  }
  if (answered.length > 0 && fillerCount / answered.length >= 2) {
    notes.push(fill(text.fillers, { fillers: String(fillerCount) }));
  }
  const skipped = answered.filter(turn => turn.skipped).length;
  if (skipped > 0) {
    notes.push(fill(text.skipped, { count: String(skipped) }));
  }
  const hints = turns.filter(turn => turn.hintUsed).length;
  if (hints > 0) {
    notes.push(fill(text.hints, { count: String(hints) }));
  }
  if (delta != null && delta < 0) {
    notes.push(text.confidenceDown);
  }
  if (notes.length === 0) {
    notes.push(bank.coach.report.empty.focus);
  }
  return notes.slice(0, MAX_NOTES);
}

type Dimension = 'substance' | 'clarity' | 'depth';

export function strongestDimension(rubric: RubricAverages): Dimension {
  let best: Dimension = 'substance';
  if ((rubric.clarity ?? 0) > dimensionValue(rubric, best)) best = 'clarity';
  if ((rubric.depth ?? 0) > dimensionValue(rubric, best)) best = 'depth';
  return best;
}

export function weakestDimension(rubric: RubricAverages): Dimension {
  let worst: Dimension = 'substance';
  if ((rubric.clarity ?? 0) < dimensionValue(rubric, worst)) worst = 'clarity';
  if ((rubric.depth ?? 0) < dimensionValue(rubric, worst)) worst = 'depth';
  return worst;
}

function dimensionValue(rubric: RubricAverages, dimension: Dimension): number {
  return rubric[dimension] ?? 0;
}

function average(turns: LocalTurn[], field: (turn: LocalTurn) => number | null): number {
  const values = turns.map(field).filter((value): value is number => value != null);
  if (values.length === 0) {
    return 0;
  }
  return round1(values.reduce((total, value) => total + value, 0) / values.length);
}

function sum(turns: LocalTurn[], field: (turn: LocalTurn) => number | null): number {
  return turns.reduce((total, turn) => total + (field(turn) ?? 0), 0);
}
