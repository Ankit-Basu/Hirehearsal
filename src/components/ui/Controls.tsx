'use client';

import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A skeuomorphic toggle: recessed track, raised knob, LED glow when on. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-50')}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-mint/50 bg-mint/25 shadow-[inset_0_1px_4px_rgba(0,0,0,0.45),0_0_14px_-4px_var(--color-mint)]'
            : 'border-white/10 bg-black/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className={cn(
            'absolute top-0.5 size-6 rounded-full',
            checked ? 'left-[1.375rem]' : 'left-0.5',
            'bg-gradient-to-b from-white to-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.6),inset_0_-1px_0_rgba(0,0,0,0.2)]',
          )}
        />
      </button>
    </div>
  );
}

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  title?: string;
}

/** An inset track with a raised sliding thumb. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const groupId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('well inline-flex w-full gap-1 rounded-2xl p-1', className)}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 rounded-xl px-3 font-medium transition-colors',
              size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm',
              selected ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                className="absolute inset-0 rounded-xl border border-white/12 bg-gradient-to-b from-white/16 to-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_10px_-6px_rgba(0,0,0,0.9)]"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  children,
  className,
  tone = 'neutral',
  onClick,
  selected,
  title,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'neutral' | 'mint' | 'iris' | 'amber' | 'rose' | 'sky';
  onClick?: () => void;
  selected?: boolean;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: '',
    mint: 'border-mint/30 bg-mint/10 text-mint',
    iris: 'border-iris/30 bg-iris/10 text-iris',
    amber: 'border-amber/30 bg-amber/10 text-amber',
    rose: 'border-rose/30 bg-rose/10 text-rose',
    sky: 'border-sky/30 bg-sky/10 text-sky',
  };
  const content = cn('chip', tones[tone], selected && 'border-mint/60 bg-mint/15 text-mint', className);

  if (!onClick) {
    return (
      <span className={content} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(content, 'transition hover:text-fg')} title={title}>
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
