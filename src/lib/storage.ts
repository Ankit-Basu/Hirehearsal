/**
 * localStorage helpers that never throw. Storage can be unavailable in private windows or when site
 * data is blocked, so every read falls back to a default and every write is best effort.
 */

export const KEYS = {
  token: 'hh:token',
  user: 'hh:user',
  settings: 'hh:settings',
  history: 'hh:history',
  interviews: 'hh:interviews',
  lastSetup: 'hh:last-setup',
} as const;

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage blocked: the app keeps working without persistence.
  }
}

export function readString(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignored on purpose.
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignored on purpose.
  }
}
