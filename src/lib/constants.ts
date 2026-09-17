import type { Persona, Round, Tier, Track } from '@/lib/types';

/** Display metadata for the four interview formats. */
export const TRACKS: Record<
  Track,
  { label: string; short: string; blurb: string; example: string; icon: string }
> = {
  technical: {
    label: 'Technical round',
    short: 'Technical',
    blurb: 'Core CS and stack questions on the topic you pick, or the skills in a job description.',
    example: 'DBMS · Operating Systems · DSA · System Design · Spring Boot · React',
    icon: 'terminal',
  },
  project: {
    label: 'Project deep-dive',
    short: 'Project',
    blurb: 'Defend your own project: architecture, decisions, trade-offs, testing and scale.',
    example: 'Why this stack? What breaks at 100x traffic?',
    icon: 'layers',
  },
  hr: {
    label: 'HR & behavioural',
    short: 'HR',
    blurb: 'STAR-style questions about teamwork, failure, feedback and motivation.',
    example: 'Tell me about a time you disagreed with a teammate.',
    icon: 'users',
  },
  mixed: {
    label: 'Full interview loop',
    short: 'Full loop',
    blurb: 'A realistic mix: an HR opener, technical questions, your project, then an HR close.',
    example: 'Closest to a real placement interview',
    icon: 'repeat',
  },
};

/** The interviewer's temperament. Hue feeds the avatar's shader. */
export const PERSONAS: Record<
  Persona,
  { label: string; blurb: string; sample: string; hue: number; accent: string; rate: number; pitch: number }
> = {
  mentor: {
    label: 'Mentor',
    blurb: 'Warm and encouraging. Starts easy, builds you up, still scores honestly.',
    sample: '“Good answer. You’re clearly on the right track.”',
    hue: 140,
    accent: 'var(--color-mint)',
    rate: 0.97,
    pitch: 1.05,
  },
  panelist: {
    label: 'Panelist',
    blurb: 'Balanced and professional, like a real interview panel. Neutral and precise.',
    sample: '“Solid answer, with room for more depth.”',
    hue: 0,
    accent: 'var(--color-iris)',
    rate: 1,
    pitch: 1,
  },
  bar_raiser: {
    label: 'Bar raiser',
    blurb: 'Demanding. Probes edge cases, challenges vague claims and scores strictly.',
    sample: '“Too thin. You asserted more than you justified.”',
    hue: 300,
    accent: 'var(--color-rose)',
    rate: 1.06,
    pitch: 0.94,
  },
};

export const ROUND_LABELS: Record<Round, string> = {
  technical: 'Technical',
  project: 'Project',
  hr: 'HR',
};

export const TIER_LABELS: Record<Tier, string> = {
  foundation: 'Foundation',
  core: 'Core',
  stretch: 'Stretch',
};

export const RUBRIC_LABELS: Record<'substance' | 'clarity' | 'depth', { label: string; help: string }> = {
  substance: { label: 'Substance', help: 'Correct, relevant content that answers the question asked.' },
  clarity: { label: 'Clarity', help: 'Structure and articulation: easy to follow, few fillers.' },
  depth: { label: 'Depth', help: 'Reasoning, examples and trade-offs rather than recall.' },
};

/** A comfortable speaking range for interviews. */
export const WPM_RANGE = { min: 110, max: 165 } as const;

export const QUESTION_COUNTS = [3, 5, 7] as const;

export const TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '120s' },
] as const;

export const RECOGNITION_LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
] as const;
