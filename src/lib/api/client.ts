/** Thin fetch wrapper that understands the API's RFC 9457 problem responses. */

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, title: string, detail: string, fieldErrors?: Record<string, string>) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.fieldErrors = fieldErrors;
  }

  /** True when the API could not be reached at all, so the offline engine should take over. */
  get isOffline(): boolean {
    return this.status === 0 || this.status === 404 || this.status >= 502;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = 30_000, signal } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    clearTimeout(timeout);
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    throw new ApiError(
      0,
      aborted ? 'Timed out' : 'Network error',
      aborted
        ? 'The interview API did not respond in time.'
        : 'Could not reach the interview API from this browser.',
    );
  }
  clearTimeout(timeout);

  if (!response.ok) {
    throw await problemFrom(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function problemFrom(response: Response): Promise<ApiError> {
  let title = response.statusText || 'Request failed';
  let detail = `The API responded with ${response.status}.`;
  let fieldErrors: Record<string, string> | undefined;

  try {
    const payload = (await response.json()) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string>;
    };
    if (payload.title) title = payload.title;
    if (payload.detail) detail = payload.detail;
    if (payload.errors) fieldErrors = payload.errors;
  } catch {
    // Non-JSON error body (for example an HTML proxy error page).
  }

  return new ApiError(response.status, title, detail, fieldErrors);
}
