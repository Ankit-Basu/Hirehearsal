import type { Persona, Round, Tier } from '@/lib/types';
import { analyze, keywordsOf, type AnswerSignals } from './analyzer';
import { bank, placeholders, type Brief } from './bank';
import { clamp, fill, floorMod, hash } from './text';

/**
 * The offline interviewer: transparent, rule-based scoring. Mirrors `HeuristicCoach.java`, so a guest
 * interview in the browser produces the same numbers as one scored by the API.
 */

export interface Evaluation {
  score: number;
  substance: number;
  clarity: number;
  depth: number;
  feedback: string;
  tip: string;
  outline: string[];
  evaluatedBy: 'heuristic';
  wordCount: number;
  fillerCount: number;
}

type Dimension = 'substance' | 'clarity' | 'depth';

const LENIENCY: Record<Persona, number> = { mentor: 0.5, panelist: 0, bar_raiser: -0.8 };
const LEVEL_UP: Record<Persona, number> = { mentor: 9, panelist: 8, bar_raiser: 7 };
const LEVEL_DOWN: Record<Persona, number> = { mentor: 5, panelist: 4, bar_raiser: 3 };

export function substanceScore(s: AnswerSignals, round: Round): number {
  const w = s.words;
  const lengthPoints = w < 5 ? 1 : w < 15 ? 3 : w < 30 ? 5 : w < 60 ? 7 : w <= 180 ? 8.5 : w <= 260 ? 8 : 7;
  const overlapPoints = 3 + 7 * Math.min(1, s.overlap * 1.4);
  const value = round === 'hr' ? 0.6 * lengthPoints + 0.4 * overlapPoints : 0.5 * lengthPoints + 0.5 * overlapPoints;
  return clamp(value, 0, 10);
}

export function clarityScore(s: AnswerSignals): number {
  let value = 8;
  if (s.words < 15) {
    value -= 3;
  }
  // Speech transcripts rarely carry punctuation, so sentence length is only judged for typed answers.
  if (s.hasPunctuation) {
    if (s.avgSentenceLength > 40) {
      value -= 2;
    } else if (s.avgSentenceLength > 28) {
      value -= 1;
    }
  }
  value -= Math.min(3, (s.fillers / Math.max(s.words, 1)) * 60);
  if (s.signposts >= 2) {
    value += 1;
  }
  if (s.words > 260) {
    value -= 1;
  }
  return clamp(value, 0, 10);
}

export function depthScore(s: AnswerSignals, round: Round): number {
  let value =
    2.5 +
    Math.min(s.connectors, 4) * 1.1 +
    Math.min(s.examples, 2) * 1.2 +
    (s.words >= 60 ? 1 : 0) +
    (s.quantified ? 0.6 : 0);
  if (round === 'hr') {
    value += s.star * 0.9;
  }
  return clamp(value, 0, 10);
}

export function bandOf(score: number): string {
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  return 'weak';
}

export function evaluateAnswer(
  round: Round,
  persona: Persona,
  question: string,
  answer: string,
  skipped: boolean,
  hintUsed: boolean,
): Evaluation {
  const signals = analyze(question, answer, round);
  const outline = outlineFor(round, signals.keywords);
  const tone = bank.coach.tone[persona];

  if (skipped || signals.words === 0) {
    return {
      score: 0,
      substance: 0,
      clarity: 0,
      depth: 0,
      feedback: tone.skipped,
      tip: bank.coach.tips.skipped,
      outline,
      evaluatedBy: 'heuristic',
      wordCount: signals.words,
      fillerCount: signals.fillers,
    };
  }

  const substance = substanceScore(signals, round);
  const clarity = clarityScore(signals);
  const depth = depthScore(signals, round);
  const raw = 0.4 * substance + 0.3 * clarity + 0.3 * depth + LENIENCY[persona] - (hintUsed ? 1 : 0);

  const score = clamp(Math.round(raw), 1, 10);
  const sub = clamp(Math.round(substance), 0, 10);
  const cla = clamp(Math.round(clarity), 0, 10);
  const dep = clamp(Math.round(depth), 0, 10);

  const band = bandOf(score);
  const weakest = weakestOf(sub, cla, dep);
  const observation =
    band === 'excellent' || band === 'good'
      ? bank.coach.strength[strongestOf(sub, cla, dep)]
      : bank.coach.weakness[weakest];

  return {
    score,
    substance: sub,
    clarity: cla,
    depth: dep,
    feedback: `${tone[band]} ${observation}`,
    tip: tipFor(signals, round, sub, cla, dep, weakest),
    outline,
    evaluatedBy: 'heuristic',
    wordCount: signals.words,
    fillerCount: signals.fillers,
  };
}

function tipFor(
  s: AnswerSignals,
  round: Round,
  sub: number,
  cla: number,
  dep: number,
  weakest: Dimension,
): string {
  const { tips } = bank.coach;
  if (Math.min(sub, cla, dep) >= 8) {
    return tips.polish;
  }
  if (s.words > 260) {
    return tips.rambling;
  }
  if (weakest === 'substance') {
    return s.words < 25 || s.keywords.length === 0
      ? tips.tooShort
      : fill(tips.offTopic, { keywords: joinKeywords(s.keywords) });
  }
  if (weakest === 'clarity') {
    if (s.fillers >= 3) {
      return fill(tips.fillers, { fillers: String(s.fillers) });
    }
    return s.hasPunctuation && s.avgSentenceLength > 28 ? tips.longSentences : tips.signpost;
  }
  return round === 'hr' ? tips.depthHr : round === 'project' ? tips.depthProject : tips.depthTechnical;
}

export function outlineFor(round: Round, keywords: string[]): string[] {
  const { outlines } = bank.coach;
  if (round === 'technical') {
    const lead =
      keywords.length === 0
        ? outlines.lead
        : fill(outlines.leadWithKeywords, { keywords: joinKeywords(keywords) });
    return [lead, ...outlines.technical];
  }
  return round === 'project' ? outlines.project : outlines.hr;
}

export function hintFor(round: Round, question: string): string {
  const nudges = bank.hints[round];
  const nudge = nudges[floorMod(hash(question), nudges.length)];
  const keywords = keywordsOf(question);
  if (keywords.length === 0) {
    return nudge;
  }
  return `${fill(bank.coach.hintPrefix, { keywords: joinKeywords(keywords) })} ${nudge}`;
}

export function openerFor(brief: Brief): string {
  const subject = fill(bank.coach.subjects[brief.track], placeholders(brief));
  return fill(bank.coach.openers[brief.persona], {
    count: String(brief.questionCount),
    subject,
  });
}

export function startTier(persona: Persona, round: Round): Tier {
  return round === 'hr' || persona === 'mentor' ? 'foundation' : 'core';
}

export function nextTier(persona: Persona, current: Tier, score: number): Tier {
  if (score >= LEVEL_UP[persona]) {
    return current === 'foundation' ? 'core' : 'stretch';
  }
  if (score <= LEVEL_DOWN[persona]) {
    return current === 'stretch' ? 'core' : 'foundation';
  }
  return current;
}

function strongestOf(sub: number, cla: number, dep: number): Dimension {
  let best: Dimension = 'substance';
  let bestValue = sub;
  if (cla > bestValue) {
    best = 'clarity';
    bestValue = cla;
  }
  if (dep > bestValue) {
    best = 'depth';
  }
  return best;
}

function weakestOf(sub: number, cla: number, dep: number): Dimension {
  let worst: Dimension = 'substance';
  let worstValue = sub;
  if (cla < worstValue) {
    worst = 'clarity';
    worstValue = cla;
  }
  if (dep < worstValue) {
    worst = 'depth';
  }
  return worst;
}

function joinKeywords(keywords: string[]): string {
  return keywords.slice(0, 3).join(', ');
}
