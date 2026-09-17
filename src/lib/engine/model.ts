import type { InterviewStatus, Persona, Round, Tier, Track } from '@/lib/types';

/** An interview stored in the browser, used when the API is unreachable. */
export interface LocalTurn {
  index: number;
  round: Round;
  tier: Tier;
  question: string;
  questionSource: string;
  askedAt: string;
  answered: boolean;
  answer: string | null;
  skipped: boolean;
  answeredAt: string | null;
  hintUsed: boolean;
  hint: string | null;
  score: number | null;
  substance: number | null;
  clarity: number | null;
  depth: number | null;
  feedback: string | null;
  tip: string | null;
  outline: string[];
  evaluatedBy: string | null;
  wordCount: number | null;
  fillerCount: number | null;
  speakingSeconds: number | null;
  durationSeconds: number | null;
  inputMode: string | null;
}

export interface LocalInterview {
  id: string;
  track: Track;
  persona: Persona;
  status: InterviewStatus;
  role: string | null;
  topic: string | null;
  projectName: string | null;
  projectSummary: string | null;
  jobDescription: string | null;
  headline: string;
  rounds: Round[];
  drill: boolean;
  drillQuestions: string[];
  sourceInterviewId: string | null;
  questionCount: number;
  answeredCount: number;
  preConfidence: number;
  postConfidence: number | null;
  reflection: string | null;
  overallScore: number | null;
  endedEarly: boolean;
  engine: 'offline';
  createdAt: string;
  finishedAt: string | null;
  turns: LocalTurn[];
}
