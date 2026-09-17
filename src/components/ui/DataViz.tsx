'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { scoreColor } from '@/lib/format';

/** Circular gauge for a 0-10 score. */
export function ScoreRing({
  score,
  size = 132,
  label,
  sublabel,
}: {
  score: number | null;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const stroke = size >= 120 ? 10 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = score == null ? 0 : Math.max(0, Math.min(1, score / 10));
  const color = scoreColor(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{
            filter: `drop-shadow(0 0 10px ${color}66)`,
            transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score == null ? (
          <span className="text-2xl font-semibold text-subtle">—</span>
        ) : (
          <span className="font-mono text-3xl font-semibold tabular-nums text-fg">
            {score.toFixed(1)}
            <span className="text-base text-subtle">/10</span>
          </span>
        )}
        {label && <span className="mt-0.5 text-xs font-medium text-muted">{label}</span>}
        {sublabel && <span className="text-[0.65rem] uppercase tracking-wider text-subtle">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Horizontal bar for a 0-max value. */
export function Meter({
  value,
  max = 10,
  label,
  hint,
  color,
  className,
}: {
  value: number | null;
  max?: number;
  label: ReactNode;
  hint?: ReactNode;
  color?: string;
  className?: string;
}) {
  const fraction = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const barColor = color ?? scoreColor(value == null ? null : (value / max) * 10);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm text-fg">{label}</span>
        <span className="font-mono text-sm tabular-nums text-muted">
          {value == null ? '—' : value.toFixed(1)}
          <span className="text-subtle">/{max}</span>
        </span>
      </div>
      <div className="well h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{
            background: barColor,
            boxShadow: `0 0 12px -2px ${barColor}`,
            width: `${fraction * 100}%`,
            transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** Compact trend line for recent scores. */
export function Sparkline({
  points,
  width = 240,
  height = 56,
  className,
}: {
  points: (number | null)[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const values = points.filter((point): point is number => point != null);
  if (values.length < 2) {
    return <div className={cn('flex h-14 items-center text-xs text-subtle', className)}>Not enough data yet</div>;
  }

  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const step = width / (values.length - 1);
  const coords = values.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / span) * (height - 8) - 4,
  }));
  const line = coords.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${line} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-14 w-full', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mint)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-mint)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-mint)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill="var(--color-mint)" />
    </svg>
  );
}

/** Day-by-day activity bars. */
export function ActivityBars({
  data,
  className,
}: {
  data: { date: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map(entry => entry.value));
  return (
    <div className={cn('flex items-end gap-1.5', className)}>
      {data.map(entry => (
        <div key={entry.date} className="group flex flex-1 flex-col items-center gap-1.5">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-mint/25 to-mint/70"
            style={{
              minHeight: 3,
              height: `${Math.max(3, (entry.value / max) * 56)}px`,
              transition: 'height 0.6s ease-out',
            }}
            title={`${entry.date}: ${entry.value}`}
          />
          <span className="text-[0.6rem] text-subtle">{entry.date.slice(-2)}</span>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">{label}</p>
        {icon && <span className="text-muted/70">{icon}</span>}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
