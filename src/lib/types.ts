/** Shapes returned by the Spring Boot API. The offline engine produces the same objects. */

export type Track = 'technical' | 'project' | 'hr' | 'mixed';
export type Round = 'technical' | 'project' | 'hr';
export type Persona = 'mentor' | 'panelist' | 'bar_raiser';
export type Tier = 'foundation' | 'core' | 'stretch';
export type InterviewStatus = 'in_progress' | 'awaiting_reflection' | 'finished';
export type InputMode = 'voice' | 'text' | 'mixed';
export type Engine = 'llm' | 'offline';

export interface DrillQuestion {
  question: string;
  round?: Round;
}

export interface StartInterviewRequest {
  track: Track;
  persona: Persona;
  role?: string | null;
  topic?: string | null;
  projectName?: string | null;
  projectSummary?: string | null;
  jobDescription?: string | null;
  questionCount: number;
  preConfidence: number;
  questions?: DrillQuestion[];
  sourceInterviewId?: string | null;
}

export interface QuestionView {
  index: number;
  round: Round;
  question: string;
}

export interface InterviewStarted {
  id: string;
  track: Track;
  persona: Persona;
  headline: string;
  questionCount: number;
  preConfidence: number;
  drill: boolean;
  engine: Engine;
  opener: string;
  question: QuestionView;
  createdAt: string;
}

export interface RubricScores {
  substance: number;
  clarity: number;
  depth: number;
}

export interface EvaluationView {
  index: number;
  score: number;
  rubric: RubricScores;
  feedback: string;
  tip: string | null;
  outline: string[];
  skipped: boolean;
  hintUsed: boolean;
  evaluatedBy: string;
  wordCount: number;
  fillerCount: number;
  wpm: number | null;
}

export interface SpeechMetrics {
  durationSeconds?: number;
  speakingSeconds?: number;
  inputMode?: InputMode;
}

export interface AnswerSubmission {
  index: number;
  answer: string;
  skipped?: boolean;
  metrics?: SpeechMetrics;
}

export interface AnswerResult {
  evaluation: EvaluationView;
  next: QuestionView | null;
  completed: boolean;
  engine: Engine;
}

export interface HintResult {
  index: number;
  hint: string;
  source: string;
}

export interface FinishRequest {
  postConfidence: number;
  reflection?: string | null;
}

export interface RubricAverages {
  substance: number | null;
  clarity: number | null;
  depth: number | null;
}

export interface SpeechSummary {
  avgWpm: number | null;
  fillerCount: number;
  totalWords: number;
  speakingSeconds: number;
}

export interface TurnReview {
  index: number;
  round: Round;
  tier: Tier;
  question: string;
  answered: boolean;
  answer: string | null;
  skipped: boolean;
  hintUsed: boolean;
  hint: string | null;
  score: number | null;
  rubric: RubricScores | null;
  feedback: string | null;
  tip: string | null;
  outline: string[];
  evaluatedBy: string | null;
  wordCount: number | null;
  fillerCount: number | null;
  speakingSeconds: number | null;
  durationSeconds: number | null;
  inputMode: string | null;
  wpm: number | null;
}

export interface Scorecard {
  id: string;
  track: Track;
  persona: Persona;
  status: InterviewStatus;
  headline: string;
  role: string | null;
  topic: string | null;
  projectName: string | null;
  drill: boolean;
  sourceInterviewId: string | null;
  questionCount: number;
  answeredCount: number;
  endedEarly: boolean;
  preConfidence: number;
  postConfidence: number | null;
  confidenceDelta: number | null;
  reflection: string | null;
  overallScore: number | null;
  band: string;
  rubric: RubricAverages | null;
  speech: SpeechSummary;
  highlights: string[];
  focusAreas: string[];
  turns: TurnReview[];
  owned: boolean;
  engine: Engine;
  createdAt: string;
  finishedAt: string | null;
}

export interface InterviewSummary {
  id: string;
  track: Track;
  persona: Persona;
  status: InterviewStatus;
  headline: string;
  overallScore: number | null;
  confidenceDelta: number | null;
  answeredCount: number;
  questionCount: number;
  drill: boolean;
  createdAt: string;
}

export interface PageView<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface UserView {
  id: string;
  email: string;
  name: string;
  targetRole: string | null;
  weeklyGoal: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserView;
}

export interface TrendPoint {
  id: string;
  createdAt: string;
  overallScore: number | null;
  track: Track;
}

export interface Progress {
  readiness: number;
  readinessByRound: Record<string, number | null>;
  streakDays: number;
  practicedToday: boolean;
  weekly: { goal: number; completed: number };
  totals: { interviews: number; answers: number; minutesSpoken: number };
  trend: TrendPoint[];
  rubric: RubricAverages | null;
  recent: InterviewSummary[];
}

export interface Insights {
  totals: { interviews: number; finished: number; completionRate: number; answers: number };
  averages: {
    score: number | null;
    preConfidence: number | null;
    postConfidence: number | null;
    confidenceDelta: number | null;
    wpm: number | null;
    fillersPerAnswer: number | null;
  };
  rubric: RubricAverages | null;
  tracks: Record<string, number>;
  personas: Record<string, number>;
  popularFocusAreas: { topic: string; interviews: number }[];
  daily: { date: string; interviews: number; avgScore: number | null }[];
  generatedAt: string;
}

export interface ApiStatus {
  status: string;
  version: string;
  engine: Engine;
  model: string | null;
  keysConfigured: number;
  keysAvailable: number;
  time: string;
}
