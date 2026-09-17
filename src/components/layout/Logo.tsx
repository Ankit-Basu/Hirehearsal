import { cn } from '@/lib/cn';

/**
 * The mark is a speech ring with a rising notch: a rehearsal that turns into a hire. The wordmark
 * highlights the shared "re" in hi-re-hearsal.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
      <defs>
        <linearGradient id="hh-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-mint)" />
          <stop offset="100%" stopColor="var(--color-iris)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="url(#hh-mark)" strokeWidth="2.5" opacity="0.55" />
      <path
        d="M10 20.5V15a6 6 0 0 1 12 0v1.5"
        fill="none"
        stroke="url(#hh-mark)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="24" r="2" fill="var(--color-mint)" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[0.95rem] font-semibold tracking-tight text-fg">
          hi<span className="text-mint">re</span>hearsal
        </span>
      )}
    </span>
  );
}
