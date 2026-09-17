import { pickQuestion, placeholders, seedFor, topicLabel, type Brief } from '@/lib/engine/bank';
import { evaluateAnswer, hintFor, nextTier, openerFor, startTier } from '@/lib/engine/coach';
import type { LocalInterview, LocalTurn } from '@/lib/engine/model';
import { defaultRound, planRounds } from '@/lib/engine/planner';
import { buildScorecard, overallScoreOf, turnWpm } from '@/lib/engine/scorecard';
import { clean, isBlank, tokens, truncate } from '@/lib/engine/text';
import { KEYS, readJson, writeJson } from '@/lib/storage';
import type {
  AnswerResult,
  AnswerSubmission,
  EvaluationView,
  FinishRequest,
  HintResult,
  InterviewStarted,
  QuestionView,
  Round,
  Scorecard,
  StartInterviewRequest,
  Tier,
} from '@/lib/types';
import { ApiError } from './client';

/**
 * The interview engine running entirely in the browser. It follows the same rules as the Spring Boot
 * API so the app still works during a demo with no backend (or no network).
 */

const MAX_STORED = 20;
/** A short pause so the avatar's "thinking" state is visible, like a real evaluation round trip. */
const THINKING_MS = 650;

export function isLocalId(id: string): boolean {
  return id.startsWith('local-');
}

function loadAll(): Record<string, LocalInterview> {
  return readJson<Record<string, LocalInterview>>(KEYS.interviews, {});
}

function saveInterview(interview: LocalInterview): void {
  const all = loadAll();
  all[interview.id] = interview;
  const kept = Object.values(all)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_STORED);
  writeJson(KEYS.interviews, Object.fromEntries(kept.map(item => [item.id, item])));
}

function loadInterview(id: string): LocalInterview {
  const interview = loadAll()[id];
  if (!interview) {
    throw new ApiError(404, 'Not found', 'This interview is not stored on this device.');
  }
  return interview;
}

function briefOf(interview: LocalInterview): Brief {
  return {
    track: interview.track,
    persona: interview.persona,
    role: interview.role,
    topic: interview.topic,
    projectName: interview.projectName,
    projectSummary: interview.projectSummary,
    jobDescription: interview.jobDescription,
    questionCount: interview.questionCount,
  };
}

function newTurn(index: number, round: Round, question: string, tier: Tier, source: string): LocalTurn {
  return {
    index,
    round,
    tier,
    question: truncate(question, 600),
    questionSource: source,
    askedAt: new Date().toISOString(),
    answered: false,
    answer: null,
    skipped: false,
    answeredAt: null,
    hintUsed: false,
    hint: null,
    score: null,
    substance: null,
    clarity: null,
    depth: null,
    feedback: null,
    tip: null,
    outline: [],
    evaluatedBy: null,
    wordCount: null,
    fillerCount: null,
    speakingSeconds: null,
    durationSeconds: null,
    inputMode: null,
  };
}

function headlineOf(brief: Brief, drill: boolean): string {
  let base: string;
  if (brief.track === 'technical') {
    base = isBlank(brief.topic) ? `Technical · ${topicLabel(brief)}` : brief.topic!.trim();
  } else if (brief.track === 'project') {
    base = isBlank(brief.projectName) ? 'Project deep-dive' : brief.projectName!.trim();
  } else if (brief.track === 'hr') {
    base = `${isBlank(brief.role) ? '' : `${brief.role!.trim()} · `}HR round`;
  } else {
    base = `${isBlank(brief.role) ? 'Full interview loop' : brief.role!.trim()} · ${topicLabel(brief)}`;
  }
  return truncate(drill ? `Retry drill · ${base}` : base, 160);
}

function validate(brief: Brief, drill: boolean): void {
  if (drill) {
    return;
  }
  if ((brief.track === 'technical' || brief.track === 'mixed') && isBlank(brief.topic) && isBlank(brief.jobDescription)) {
    throw new ApiError(400, 'Invalid request', 'Add a technical focus or paste a job description.');
  }
  if (brief.track === 'project' && isBlank(brief.projectName)) {
    throw new ApiError(400, 'Invalid request', 'Tell us the name of the project you want to defend.');
  }
}

function evaluationView(turn: LocalTurn): EvaluationView {
  return {
    index: turn.index,
    score: turn.score ?? 0,
    rubric: { substance: turn.substance ?? 0, clarity: turn.clarity ?? 0, depth: turn.depth ?? 0 },
    feedback: turn.feedback ?? '',
    tip: turn.tip,
    outline: turn.outline,
    skipped: turn.skipped,
    hintUsed: turn.hintUsed,
    evaluatedBy: turn.evaluatedBy ?? 'heuristic',
    wordCount: turn.wordCount ?? 0,
    fillerCount: turn.fillerCount ?? 0,
    wpm: turnWpm(turn),
  };
}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function newId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `local-${random}`;
}

export const local = {
  async startInterview(request: StartInterviewRequest): Promise<InterviewStarted> {
    const drillQuestions = (request.questions ?? []).filter(entry => !isBlank(entry.question));
    const drill = drillQuestions.length > 0;
    const questionCount = drill ? drillQuestions.length : request.questionCount;
    if (!drill && (questionCount < 3 || questionCount > 8)) {
      throw new ApiError(400, 'Invalid request', 'An interview needs between 3 and 8 questions.');
    }

    const brief: Brief = {
      track: request.track,
      persona: request.persona,
      role: clean(request.role),
      topic: clean(request.topic),
      projectName: clean(request.projectName),
      projectSummary: request.projectSummary?.trim() || null,
      jobDescription: request.jobDescription?.trim() || null,
      questionCount,
    };
    validate(brief, drill);

    const rounds = drill
      ? drillQuestions.map(entry => entry.round ?? defaultRound(request.track))
      : planRounds(request.track, questionCount, !isBlank(brief.projectName));

    const id = newId();
    const seed = seedFor(id);
    const firstRound = rounds[0];
    const tier = startTier(request.persona, firstRound);
    const first = drill
      ? { question: clean(drillQuestions[0].question)!, tier, source: 'custom' }
      : pickQuestion(firstRound, brief, tier, 1, [], seed);

    const interview: LocalInterview = {
      id,
      track: request.track,
      persona: request.persona,
      status: 'in_progress',
      role: brief.role ?? null,
      topic: brief.topic ?? null,
      projectName: brief.projectName ?? null,
      projectSummary: brief.projectSummary ?? null,
      jobDescription: brief.jobDescription ?? null,
      headline: headlineOf(brief, drill),
      rounds,
      drill,
      drillQuestions: drillQuestions.map(entry => clean(entry.question)!),
      sourceInterviewId: clean(request.sourceInterviewId),
      questionCount,
      answeredCount: 0,
      preConfidence: request.preConfidence,
      postConfidence: null,
      reflection: null,
      overallScore: null,
      endedEarly: false,
      engine: 'offline',
      createdAt: new Date().toISOString(),
      finishedAt: null,
      turns: [newTurn(1, firstRound, first.question, first.tier, first.source)],
    };
    saveInterview(interview);

    return {
      id,
      track: interview.track,
      persona: interview.persona,
      headline: interview.headline,
      questionCount,
      preConfidence: interview.preConfidence,
      drill,
      engine: 'offline',
      opener: openerFor(brief),
      question: { index: 1, round: firstRound, question: first.question },
      createdAt: interview.createdAt,
    };
  },

  async submitAnswer(id: string, submission: AnswerSubmission): Promise<AnswerResult> {
    const interview = loadInterview(id);
    if (interview.status !== 'in_progress') {
      throw new ApiError(409, 'Conflict', 'This interview is no longer accepting answers.');
    }
    const turn = interview.turns[interview.turns.length - 1];
    if (!turn || turn.answered || turn.index !== submission.index) {
      throw new ApiError(409, 'Conflict', `Question ${submission.index} is not the open question.`);
    }

    await delay(THINKING_MS);

    const answer = submission.answer ?? '';
    const skipped = Boolean(submission.skipped) || tokens(answer).length === 0;
    const evaluation = evaluateAnswer(
      turn.round,
      interview.persona,
      turn.question,
      answer,
      skipped,
      turn.hintUsed,
    );

    turn.answered = true;
    turn.skipped = skipped;
    turn.answer = skipped ? null : truncate(answer.trim(), 6000);
    turn.answeredAt = new Date().toISOString();
    turn.score = evaluation.score;
    turn.substance = evaluation.substance;
    turn.clarity = evaluation.clarity;
    turn.depth = evaluation.depth;
    turn.feedback = evaluation.feedback;
    turn.tip = evaluation.tip;
    turn.outline = evaluation.outline;
    turn.evaluatedBy = evaluation.evaluatedBy;
    turn.wordCount = evaluation.wordCount;
    turn.fillerCount = evaluation.fillerCount;
    turn.durationSeconds = submission.metrics?.durationSeconds ?? null;
    turn.speakingSeconds = submission.metrics?.speakingSeconds ?? null;
    turn.inputMode = submission.metrics?.inputMode ?? 'text';

    interview.answeredCount += 1;

    let next: QuestionView | null = null;
    if (turn.index < interview.questionCount) {
      const nextIndex = turn.index + 1;
      const nextRound = interview.rounds[nextIndex - 1];
      const tier = nextTier(interview.persona, turn.tier, evaluation.score);
      const draft = interview.drill
        ? { question: interview.drillQuestions[nextIndex - 1], tier, source: 'custom' }
        : pickQuestion(
            nextRound,
            briefOf(interview),
            tier,
            nextIndex,
            interview.turns.map(item => item.question),
            seedFor(id),
          );
      interview.turns.push(newTurn(nextIndex, nextRound, draft.question, draft.tier, draft.source));
      next = { index: nextIndex, round: nextRound, question: draft.question };
    } else {
      interview.status = 'awaiting_reflection';
    }

    interview.overallScore = overallScoreOf(interview.turns);
    saveInterview(interview);

    return { evaluation: evaluationView(turn), next, completed: next === null, engine: 'offline' };
  },

  async hint(id: string, index: number): Promise<HintResult> {
    const interview = loadInterview(id);
    const turn = interview.turns[interview.turns.length - 1];
    if (interview.status !== 'in_progress' || !turn || turn.answered || turn.index !== index) {
      throw new ApiError(409, 'Conflict', `Question ${index} is not the open question.`);
    }
    if (!turn.hint) {
      turn.hint = truncate(hintFor(turn.round, turn.question), 400);
      turn.hintUsed = true;
      saveInterview(interview);
    }
    return { index, hint: turn.hint, source: 'heuristic' };
  },

  async finish(id: string, body: FinishRequest): Promise<Scorecard> {
    const interview = loadInterview(id);
    if (interview.status === 'in_progress') {
      interview.endedEarly = true;
    }
    interview.status = 'finished';
    interview.postConfidence = body.postConfidence;
    interview.reflection = body.reflection?.trim() ? truncate(body.reflection.trim(), 600) : null;
    interview.finishedAt = interview.finishedAt ?? new Date().toISOString();
    saveInterview(interview);
    return buildScorecard(interview);
  },

  async scorecard(id: string): Promise<Scorecard> {
    return buildScorecard(loadInterview(id));
  },

  /** Placeholders for the setup screen, used to preview what Ora will say. */
  preview(brief: Brief): { opener: string; values: Record<string, string> } {
    return { opener: openerFor(brief), values: placeholders(brief) };
  },
};
