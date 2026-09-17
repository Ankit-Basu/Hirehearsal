'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export function Label({
  htmlFor,
  children,
  hint,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-2 flex items-baseline justify-between gap-3', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {children}
      </label>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: ReactNode; error?: string | null }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      )}
      <input
        id={fieldId}
        className={cn('field', error && 'border-rose/60', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-rose">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: ReactNode; error?: string | null }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      )}
      <textarea
        id={fieldId}
        className={cn('field resize-none leading-relaxed', error && 'border-rose/60', className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  className,
  id,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: ReactNode }) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div>
      {label && (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      )}
      <select id={fieldId} className={cn('field appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
    </div>
  );
}
