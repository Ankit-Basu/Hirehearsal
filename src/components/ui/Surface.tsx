import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function GlassCard({
  className,
  children,
  strong = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div className={cn(strong ? 'glass-strong' : 'glass', 'rounded-3xl', className)} {...rest}>
      {children}
    </div>
  );
}

export function Well({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('well rounded-2xl', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mint/80">{eyebrow}</p>
      )}
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {icon && <div className="text-muted/70">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
