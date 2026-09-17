'use client';

import { motion, useTransform, type MotionValue } from 'motion/react';
import { Check, Lightbulb, Mic, MicOff, SkipForward, Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import BorderGlow from '@/components/reactbits/BorderGlow';
import ShinyText from '@/components/reactbits/ShinyText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Controls';
import { RevealText } from '@/components/ui/RevealText';
import { cn } from '@/lib/cn';
import { ROUND_LABELS } from '@/lib/constants';
import { formatClock, scoreColor } from '@/lib/format';
import type { EvaluationView, QuestionView, Round } from '@/lib/types';

/** One dot per question: answered, current, or still to come. */
export function ProgressRail({
  total,
  current,
  scores,
}: {
  total: number;
  current: number;
  scores: (number | null)[];
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Question ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const position = index + 1;
        const score = scores[index];
        const done = score != null;
        const isCurrent = position === current;
        return (
          <span
            key={position}
            title={done ? `Q${position}: ${score}/10` : `Question ${position}`}
            className={cn(
              'h-1.5 rounded-full transition-all',
              isCurrent ? 'w-7' : 'w-4',
              done ? '' : isCurrent ? 'bg-mint' : 'bg-white/12',
            )}
            style={done ? { background: scoreColor(score) } : undefined}
          />
        );
      })}
    </div>
  );
}

export function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const fraction = total > 0 ? remaining / total : 0;
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const urgent = remaining <= 10;

  return (
    <div className="relative grid size-9 place-items-center" role="timer" aria-live="off">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90 size-9">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={urgent ? 'var(--color-rose)' : 'var(--color-mint)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <span className={cn('font-mono text-[0.6rem] tabular-nums', urgent ? 'text-rose' : 'text-muted')}>
        {formatClock(remaining)}
      </span>
    </div>
  );
}

export function QuestionPanel({
  question,
  total,
  hint,
  thinking,
}: {
  question: QuestionView;
  total: number;
  hint: string | null;
  thinking: boolean;
}) {
  return (
    <BorderGlow
      backgroundColor="rgba(255,255,255,0.045)"
      borderRadius={24}
      colors={['#6ff0c6', '#a18bff', '#7cc4ff']}
      glowColor="160 70 70"
      animated
      className="relative overflow-hidden p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip tone="mint">{ROUND_LABELS[question.round]}</Chip>
        <span className="text-xs font-medium text-subtle">
          Question {question.index} of {total}
        </span>
      </div>

      {thinking ? (
        <p className="text-lg text-muted">
          <ShinyText text="Ora is writing the next question…" speed={2.2} color="#6b7285" shineColor="#eef0f5" />
        </p>
      ) : (
        <RevealText
          key={question.question}
          text={question.question}
          stagger={28}
          className="text-pretty text-xl font-medium leading-snug text-fg sm:text-2xl"
        />
      )}

      {hint && (
        <div className="rise-in mt-4 flex items-start gap-2 rounded-2xl border border-amber/25 bg-amber/8 p-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber" />
          <p className="text-sm leading-relaxed text-amber/90">{hint}</p>
        </div>
      )}
    </BorderGlow>
  );
}

/** Ora's verdict on the previous answer. */
export function FeedbackCard({ evaluation }: { evaluation: EvaluationView }) {
  return (
    <div className="rise-in glass rounded-3xl p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Q{evaluation.index} · Ora&rsquo;s take
        </p>
        <span
          className="rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
          style={{
            color: scoreColor(evaluation.score),
            background: `color-mix(in oklab, ${scoreColor(evaluation.score)} 14%, transparent)`,
          }}
        >
          {evaluation.score}/10
        </span>
      </div>
      <p className="text-sm leading-relaxed text-fg">{evaluation.feedback}</p>
      {evaluation.tip && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <span className="font-medium text-mint">Next time: </span>
          {evaluation.tip}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="mint">Substance {evaluation.rubric.substance}</Chip>
        <Chip tone="sky">Clarity {evaluation.rubric.clarity}</Chip>
        <Chip tone="amber">Depth {evaluation.rubric.depth}</Chip>
        {evaluation.wpm && <Chip>{evaluation.wpm} wpm</Chip>}
        {evaluation.fillerCount > 0 && <Chip tone="rose">{evaluation.fillerCount} fillers</Chip>}
      </div>
    </div>
  );
}

/** The large press-to-talk control. */
export function MicButton({
  listening,
  disabled,
  level,
  onToggle,
}: {
  listening: boolean;
  disabled?: boolean;
  level: MotionValue<number>;
  onToggle: () => void;
}) {
  const ringScale = useTransform(level, [0, 1], [1, 1.5]);
  const ringOpacity = useTransform(level, [0, 1], [0.25, 0.7]);

  return (
    <div className="relative grid place-items-center">
      {listening && (
        <motion.span
          aria-hidden
          style={{ scale: ringScale, opacity: ringOpacity }}
          className="absolute size-14 rounded-full bg-mint/40 blur-md"
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? 'Stop recording' : 'Start recording your answer'}
        className={cn(
          'btn relative size-14 rounded-full p-0',
          listening ? 'btn-danger' : 'btn-primary',
          disabled && 'opacity-40',
        )}
      >
        {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </button>
    </div>
  );
}

export function AnswerComposer({
  value,
  interim,
  onChange,
  onSubmit,
  onPass,
  onHint,
  onToggleMic,
  listening,
  micSupported,
  micLevel,
  busy,
  hintUsed,
  words,
  fillers,
  elapsed,
}: {
  value: string;
  interim: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPass: () => void;
  onHint: () => void;
  onToggleMic: () => void;
  listening: boolean;
  micSupported: boolean;
  micLevel: MotionValue<number>;
  busy: boolean;
  hintUsed: boolean;
  words: number;
  fillers: number;
  elapsed: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest dictation visible while it streams in.
  useEffect(() => {
    if (listening && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [value, interim, listening]);

  const empty = value.trim().length === 0;

  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Your answer</p>
        <div className="flex items-center gap-1.5 text-xs text-subtle">
          <span className="font-mono tabular-nums">{words} words</span>
          {fillers > 0 && <span className="text-amber">· {fillers} fillers</span>}
          <span className="font-mono tabular-nums">· {formatClock(elapsed)}</span>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={interim ? `${value}${value ? ' ' : ''}${interim}` : value}
          onChange={event => onChange(event.target.value)}
          placeholder={
            micSupported
              ? 'Press the mic and answer out loud, or type here.'
              : 'Type your answer here. Voice input needs Chrome or Edge.'
          }
          rows={5}
          className="field min-h-[9rem] resize-none leading-relaxed"
          disabled={busy}
          aria-label="Your answer"
        />
        {listening && (
          <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 text-[0.65rem] font-medium text-mint">
            <span className="size-1.5 animate-pulse rounded-full bg-mint" />
            recording
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MicButton listening={listening} disabled={busy || !micSupported} level={micLevel} onToggle={onToggleMic} />
          <Button variant="ghost" size="sm" onClick={onHint} disabled={busy || hintUsed} title="Alt + H">
            <Lightbulb className="size-4" />
            {hintUsed ? 'Hint used' : 'Hint'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onPass} disabled={busy} title="Pass on this question">
            <SkipForward className="size-4" /> Pass
          </Button>
        </div>

        <Button variant="primary" onClick={onSubmit} loading={busy} disabled={busy || empty}>
          {busy ? 'Scoring' : 'Submit'}
          {!busy && (empty ? <Send className="size-4" /> : <Check className="size-4" />)}
        </Button>
      </div>
    </div>
  );
}

export function RoundHint({ round }: { round: Round }) {
  const hints: Record<Round, string> = {
    technical: 'Define it, explain how it works, give an example, name a trade-off.',
    project: 'Context, the decision you made, the alternative you rejected, the result.',
    hr: 'Situation, Task, Action, Result. Spend most of your time on the Action.',
  };
  return <p className="text-xs leading-relaxed text-subtle">{hints[round]}</p>;
}
