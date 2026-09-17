import type {
  AnswerResult,
  AnswerSubmission,
  FinishRequest,
  HintResult,
  InterviewStarted,
  Scorecard,
  StartInterviewRequest,
} from '@/lib/types';
import { ApiError } from './client';
import { isLocalId, local } from './local';
import { remote } from './remote';

export { ApiError } from './client';
export { isLocalId } from './local';
export { remote } from './remote';

/** Whether the Spring Boot API is reachable, and the caller's bearer token if they are signed in. */
export interface ApiContext {
  online: boolean;
  token: string | null;
}

export const api = {
  async start(ctx: ApiContext, request: StartInterviewRequest): Promise<InterviewStarted> {
    if (!ctx.online) {
      return local.startInterview(request);
    }
    try {
      return await remote.startInterview(request, ctx.token);
    } catch (error) {
      // The API answered the status check but died on the way here: keep the candidate practising.
      if (error instanceof ApiError && error.isOffline) {
        return local.startInterview(request);
      }
      throw error;
    }
  },

  answer(ctx: ApiContext, id: string, submission: AnswerSubmission): Promise<AnswerResult> {
    return isLocalId(id) ? local.submitAnswer(id, submission) : remote.submitAnswer(id, submission, ctx.token);
  },

  hint(ctx: ApiContext, id: string, index: number): Promise<HintResult> {
    return isLocalId(id) ? local.hint(id, index) : remote.hint(id, index, ctx.token);
  },

  finish(ctx: ApiContext, id: string, body: FinishRequest): Promise<Scorecard> {
    return isLocalId(id) ? local.finish(id, body) : remote.finish(id, body, ctx.token);
  },

  scorecard(ctx: ApiContext, id: string): Promise<Scorecard> {
    return isLocalId(id) ? local.scorecard(id) : remote.scorecard(id, ctx.token);
  },
};
