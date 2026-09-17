/**
 * Deterministic text helpers. These mirror `backend/src/main/java/com/hirehearsal/coach/Text.java`
 * line for line so an offline interview is scored exactly like a server-side one.
 */

const NON_WORD = /[^a-z0-9%+#]+/g;
const WHITESPACE = /\s+/g;

/** Lowercases, drops apostrophes, collapses everything else to single spaces and pads both ends. */
export function normalize(raw?: string | null): string {
  if (raw == null) {
    return ' ';
  }
  const lowered = raw.toLowerCase().replaceAll("'", '').replaceAll('’', '');
  const collapsed = lowered.replace(NON_WORD, ' ').trim();
  return collapsed === '' ? ' ' : ` ${collapsed} `;
}

export function tokens(raw?: string | null): string[] {
  const normalized = normalize(raw).trim();
  return normalized === '' ? [] : normalized.split(' ');
}

/** Counts whole-phrase occurrences inside already-normalized text. */
export function countPhrase(normalized: string, phrase: string): number {
  const needle = ` ${phrase} `;
  let count = 0;
  let index = normalized.indexOf(needle);
  while (index >= 0) {
    count++;
    index = normalized.indexOf(needle, index + needle.length - 1);
  }
  return count;
}

export function countPhrases(normalized: string, phrases: string[]): number {
  let total = 0;
  for (const phrase of phrases) {
    total += countPhrase(normalized, phrase);
  }
  return total;
}

export function containsAnyPhrase(normalized: string, phrases: string[]): boolean {
  return phrases.some(phrase => normalized.includes(` ${phrase} `));
}

/** A keyword ending in `*` matches any word that starts with it; otherwise it must match whole words. */
export function matchesKeyword(normalized: string, keyword: string): boolean {
  if (keyword.endsWith('*')) {
    return normalized.includes(` ${keyword.slice(0, -1)}`);
  }
  return normalized.includes(` ${keyword} `);
}

/** Java's String#hashCode, so both engines rotate through bank questions the same way. */
export function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (Math.imul(31, result) + value.charCodeAt(i)) | 0;
  }
  return result;
}

export function floorMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export function fill(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

/** Trims and collapses whitespace; returns null for blank input. */
export function clean(value?: string | null): string | null {
  if (value == null) {
    return null;
  }
  const collapsed = value.replace(WHITESPACE, ' ').trim();
  return collapsed === '' ? null : collapsed;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function isBlank(value?: string | null): boolean {
  return value == null || value.trim() === '';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
