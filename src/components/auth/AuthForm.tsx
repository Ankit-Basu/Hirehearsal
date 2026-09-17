'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Controls';
import { TextField } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useEngine } from '@/lib/engine-status';
import { claimableIds } from '@/lib/history';

export function AuthForm() {
  const router = useRouter();
  const { notify } = useToast();
  const { online } = useEngine();
  const { signIn, signUp, user } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = claimableIds().length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signUp(form.name.trim(), form.email.trim(), form.password);
      } else {
        await signIn(form.email.trim(), form.password);
      }
      notify({
        title: mode === 'signup' ? 'Account created' : 'Welcome back',
        description: pending > 0 ? `${pending} earlier interview(s) added to your history.` : undefined,
        tone: 'success',
      });
      router.push('/dashboard');
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  if (user) {
    return (
      <GlassCard className="mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-fg">You are signed in as {user.name}</h1>
        <p className="mt-2 text-sm text-muted">Your scorecards are saved to this account.</p>
        <div className="mt-5 flex justify-center gap-2">
          <ButtonLink href="/dashboard" variant="primary">
            Go to your progress
          </ButtonLink>
          <ButtonLink href="/start" variant="ghost">
            New interview
          </ButtonLink>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <GlassCard strong className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-fg">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Interviews work without an account. Signing in keeps your history, streak and readiness.
        </p>

        <div className="mt-5">
          <Segmented
            ariaLabel="Sign in or create an account"
            options={[
              { value: 'signin', label: 'Sign in' },
              { value: 'signup', label: 'Create account' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {!online && (
          <p className="mt-4 rounded-2xl border border-amber/25 bg-amber/8 p-3 text-xs leading-relaxed text-amber">
            The interview API is unreachable, so accounts are unavailable right now. You can still practise as a
            guest; interviews are saved in this browser.
          </p>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === 'signup' && (
            <TextField
              label="Name"
              autoComplete="name"
              required
              maxLength={60}
              value={form.name}
              onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
            />
          )}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={form.password}
            onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
            hint={mode === 'signup' ? 'at least 8 characters' : undefined}
            error={error}
          />

          <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!online}>
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {pending > 0 && (
          <p className="mt-4 text-xs text-subtle">
            {pending} interview(s) from this browser will be added to your account.
          </p>
        )}
      </GlassCard>

      <p className="mt-4 text-center text-xs text-subtle">
        <ButtonLink href="/start" variant="ghost" size="sm">
          Skip and practise as a guest
        </ButtonLink>
      </p>
    </div>
  );
}
