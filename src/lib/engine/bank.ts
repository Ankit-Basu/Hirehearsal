import bankJson from '@shared/question-bank.json';
import type { Persona, Round, Tier, Track } from '@/lib/types';
import { floorMod, hash, isBlank, matchesKeyword, normalize } from './text';
import { fill } from './text';

export interface TierSet {
  foundation: string[];
  core: string[];
  stretch: string[];
}

export interface BankTopic {
  id: string;
  label: string;
  keywords: string[];
  questions: TierSet;
}

export interface BankFile {
  version: number;
  technical: { topics: BankTopic[]; generic: TierSet };
  project: TierSet;
  hr: TierSet;
  hints: Record<Round, string[]>;
  coach: {
    subjects: Record<Track, string>;
    openers: Record<Persona, string>;
    tone: Record<Persona, Record<string, string>>;
    strength: Record<string, string>;
    weakness: Record<string, string>;
    tips: Record<string, string>;
    hintPrefix: string;
    outlines: {
      leadWithKeywords: string;
      lead: string;
      technical: string[];
      project: string[];
      hr: string[];
    };
    report: {
      bands: { min: number; label: string }[];
      highlights: {
        bestAnswer: string;
        strength: Record<string, string>;
        pace: string;
        noFillers: string;
        confidenceUp: string;
      };
      focus: {
        weakness: Record<string, string>;
        fast: string;
        slow: string;
        fillers: string;
        skipped: string;
        hints: string;
        confidenceDown: string;
      };
      empty: { highlight: string; focus: string };
    };
  };
  lexicon: {
    fillers: string[];
    connectors: string[];
    examples: string[];
    signposts: string[];
    star: { situation: string[]; action: string[]; result: string[] };
    quantifiers: string[];
    stopwords: string[];
  };
}

export const bank = bankJson as unknown as BankFile;
export const stopwords = new Set(bank.lexicon.stopwords);

/** Everything the coach needs to ask and score questions. */
export interface Brief {
  track: Track;
  persona: Persona;
  role?: string | null;
  topic?: string | null;
  projectName?: string | null;
  projectSummary?: string | null;
  jobDescription?: string | null;
  questionCount: number;
}

export interface QuestionDraft {
  question: string;
  tier: Tier;
  source: 'bank' | 'custom' | 'llm';
}

const FALLBACK_QUESTION = 'What else should an interviewer know about your experience with {topic}?';

const TIER_SEARCH_ORDER: Record<Tier, Tier[]> = {
  foundation: ['foundation', 'core', 'stretch'],
  core: ['core', 'stretch', 'foundation'],
  stretch: ['stretch', 'core', 'foundation'],
};

function rank(normalized: string): BankTopic[] {
  return bank.technical.topics
    .map((topic, order) => ({
      topic,
      order,
      score: topic.keywords.filter(keyword => matchesKeyword(normalized, keyword)).length,
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(entry => entry.topic);
}

/** Topics matched from the explicit focus first, falling back to the job description. */
export function resolveTopics(brief: Brief): BankTopic[] {
  const fromTopic = rank(normalize(brief.topic));
  return fromTopic.length > 0 ? fromTopic : rank(normalize(brief.jobDescription));
}

export function topicLabel(brief: Brief): string {
  if (!isBlank(brief.topic)) {
    return brief.topic!.trim();
  }
  const resolved = resolveTopics(brief);
  return resolved.length === 0 ? 'your target skills' : resolved[0].label;
}

export function placeholders(brief: Brief): Record<string, string> {
  return {
    topic: topicLabel(brief),
    project: isBlank(brief.projectName) ? 'your project' : brief.projectName!.trim(),
    role: isBlank(brief.role) ? 'software engineer' : brief.role!.trim(),
  };
}

/** Picks the first unused question for a round, trying the preferred tier first. */
export function pickQuestion(
  round: Round,
  brief: Brief,
  tier: Tier,
  turnIndex: number,
  askedQuestions: string[],
  seed: number,
): QuestionDraft {
  const asked = new Set(askedQuestions.map(normalize));
  const values = placeholders(brief);

  const pools: TierSet[] = [];
  if (round === 'technical') {
    const topics = resolveTopics(brief);
    if (topics.length > 0) {
      const start = floorMod(turnIndex - 1, topics.length);
      for (let i = 0; i < topics.length; i++) {
        pools.push(topics[(start + i) % topics.length].questions);
      }
    }
    pools.push(bank.technical.generic);
  } else if (round === 'project') {
    pools.push(bank.project);
  } else {
    pools.push(bank.hr);
  }

  for (const pool of pools) {
    for (const candidateTier of TIER_SEARCH_ORDER[tier]) {
      const questions = pool[candidateTier] ?? [];
      if (questions.length === 0) {
        continue;
      }
      // The classic "tell me about yourself" opener leads an interview that starts with HR.
      const start = round === 'hr' && turnIndex === 1 ? 0 : floorMod(seed, questions.length);
      for (let k = 0; k < questions.length; k++) {
        const question = fill(questions[(start + k) % questions.length], values);
        if (!asked.has(normalize(question))) {
          return { question, tier: candidateTier, source: 'bank' };
        }
      }
    }
  }
  return { question: fill(FALLBACK_QUESTION, values), tier, source: 'bank' };
}

export function seedFor(id: string): number {
  return floorMod(hash(id), 997);
}
