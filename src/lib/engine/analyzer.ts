import type { Round } from '@/lib/types';
import { bank, stopwords } from './bank';
import { containsAnyPhrase, countPhrases, normalize, tokens } from './text';

/** Measurable signals from an answer. Mirrors `AnswerAnalyzer.java`. */
export interface AnswerSignals {
  words: number;
  hasPunctuation: boolean;
  sentences: number;
  avgSentenceLength: number;
  connectors: number;
  examples: number;
  signposts: number;
  fillers: number;
  star: number;
  quantified: boolean;
  overlap: number;
  keywords: string[];
}

const SENTENCE_END = /[.!?]/;
const SENTENCE_SPLIT = /[.!?]+/;
const DIGIT = /[0-9]/;
const ALL_DIGITS = /^[0-9]+$/;

export function analyze(question: string, answer: string | null | undefined, round: Round): AnswerSignals {
  const raw = answer ?? '';
  const normalized = normalize(raw);
  const answerTokens = tokens(raw);
  const words = answerTokens.length;

  const hasPunctuation = SENTENCE_END.test(raw);
  let sentences = 0;
  for (const part of raw.split(SENTENCE_SPLIT)) {
    if (tokens(part).length >= 3) {
      sentences++;
    }
  }
  sentences = Math.max(1, sentences);

  const { lexicon } = bank;
  const star =
    round === 'hr'
      ? (containsAnyPhrase(normalized, lexicon.star.situation) ? 1 : 0) +
        (containsAnyPhrase(normalized, lexicon.star.action) ? 1 : 0) +
        (containsAnyPhrase(normalized, lexicon.star.result) ? 1 : 0)
      : 0;

  const questionKeywords = keywordsOf(question);

  return {
    words,
    hasPunctuation,
    sentences,
    avgSentenceLength: words / sentences,
    connectors: countPhrases(normalized, lexicon.connectors),
    examples: countPhrases(normalized, lexicon.examples),
    signposts: countPhrases(normalized, lexicon.signposts),
    fillers: countPhrases(normalized, lexicon.fillers),
    star,
    quantified: DIGIT.test(raw) || containsAnyPhrase(normalized, lexicon.quantifiers),
    overlap: overlapOf(questionKeywords, answerTokens),
    keywords: questionKeywords,
  };
}

/** Distinct, meaningful words from the question, in order of appearance. */
export function keywordsOf(question: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens(question)) {
    if (token.length >= 4 && !stopwords.has(token) && !ALL_DIGITS.test(token) && !seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }
  return result;
}

function stem(token: string): string {
  return token.length > 5 ? token.slice(0, 5) : token;
}

export function overlapOf(keywords: string[], answerTokens: string[]): number {
  const stems = new Set(keywords.map(stem));
  if (stems.size === 0) {
    return 0.5;
  }
  const answerStems = new Set(answerTokens.filter(token => token.length >= 4).map(stem));
  let matched = 0;
  for (const value of stems) {
    if (answerStems.has(value)) {
      matched++;
    }
  }
  return matched / stems.size;
}

/** Live counts for the answer box while the candidate speaks or types. */
export function liveMetrics(answer: string): { words: number; fillers: number } {
  const normalized = normalize(answer);
  return {
    words: tokens(answer).length,
    fillers: countPhrases(normalized, bank.lexicon.fillers),
  };
}
