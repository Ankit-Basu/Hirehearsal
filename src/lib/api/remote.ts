import type {
  AnswerResult,
  AnswerSubmission,
  ApiStatus,
  AuthResponse,
  FinishRequest,
  HintResult,
  Insights,
  InterviewStarted,
  InterviewSummary,
  PageView,
  Progress,
  Scorecard,
  StartInterviewRequest,
  UserView,
} from '@/lib/types';
import { request } from './client';

const ANSWER_TIMEOUT_MS = 45_000;

export const remote = {
  status: (timeoutMs = 4000) => request<ApiStatus>('/api/status', { timeoutMs }),

  startInterview: (body: StartInterviewRequest, token: string | null) =>
    request<InterviewStarted>('/api/interviews', { method: 'POST', body, token, timeoutMs: ANSWER_TIMEOUT_MS }),

  submitAnswer: (id: string, body: AnswerSubmission, token: string | null) =>
    request<AnswerResult>(`/api/interviews/${id}/answers`, {
      method: 'POST',
      body,
      token,
      timeoutMs: ANSWER_TIMEOUT_MS,
    }),

  hint: (id: string, index: number, token: string | null) =>
    request<HintResult>(`/api/interviews/${id}/hint`, { method: 'POST', body: { index }, token }),

  finish: (id: string, body: FinishRequest, token: string | null) =>
    request<Scorecard>(`/api/interviews/${id}/finish`, { method: 'POST', body, token }),

  scorecard: (id: string, token: string | null) => request<Scorecard>(`/api/interviews/${id}`, { token }),

  insights: () => request<Insights>('/api/insights'),

  register: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body }),

  me: (token: string) => request<UserView>('/api/me', { token }),

  updateProfile: (
    body: { name?: string; targetRole?: string | null; weeklyGoal?: number },
    token: string,
  ) => request<UserView>('/api/me', { method: 'PATCH', body, token }),

  myInterviews: (token: string, page = 0, size = 20) =>
    request<PageView<InterviewSummary>>(`/api/me/interviews?page=${page}&size=${size}`, { token }),

  progress: (token: string, timeZone: string) =>
    request<Progress>(`/api/me/progress?tz=${encodeURIComponent(timeZone)}`, { token }),

  claim: (interviewIds: string[], token: string) =>
    request<{ claimed: number }>('/api/me/claim', { method: 'POST', body: { interviewIds }, token }),
};
