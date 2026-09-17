'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  Link2,
  Printer,
  Repeat,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import ClickSpark from '@/components/reactbits/ClickSpark';
import ElasticSlider from '@/components/reactbits/ElasticSlider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Controls';
import { Meter, ScoreRing, StatTile } from '@/components/ui/DataViz';
import { TextAreaField } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError, isLocalId } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { PERSONAS, ROUND_LABELS, RUBRIC_LABELS, TRACKS, WPM_RANGE } from '@/lib/constants';
import { downloadText, scorecardToMarkdown, slugify } from '@/lib/download';
import { useEngine } from '@/lib/engine-status';
import { formatDate, formatDuration, scoreColor } from '@/lib/format';
import { rememberScorecard } from '@/lib/history';
import type { Scorecard, TurnReview } from '@/lib/types';

export function ScorecardView({ id }: { id: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const { online } = useEngine();
  const { token, user } = useAuth();

  const [card, setCard] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postConfidence, setPostConfidence] = useState(6);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .scorecard({ online, token }, id)
      .then(loaded => {
        if (cancelled) return;
        setCard(loaded);
        setPostConfidence(loaded.postConfidence ?? Math.min(10, loaded.preConfidence + 2));
        setReflection(loaded.reflection ?? '');
        rememberScorecard(loaded, isLocalId(loaded.id) ? 'local' : 'api');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404
            ? 'This scorecard is not on this device, and the API does not have it either.'
            : 'Could not load this scorecard. Check that the API is running and try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, online, token]);

  const saveReflection = useCallback(async () => {
    if (!card) return;
    setSaving(true);
    try {
      const updated = await api.finish({ online, token }, id, { postConfidence, reflection: reflection || null });
      setCard(updated);
      rememberScorecard(updated, isLocalId(updated.id) ? 'local' : 'api');
      notify({ title: 'Scorecard saved', tone: 'success' });
    } catch (caught: unknown) {
      notify({
        title: 'Could not save your reflection',
        description: caught instanceof ApiError ? caught.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [card, id, notify, online, postConfidence, reflection, token]);

  const startDrill = useCallback(() => {
    if (!card || selected.length === 0) return;
    const questions = card.turns
      .filter(turn => selected.includes(turn.index))
      .map(turn => ({ question: turn.question, round: turn.round }));

    try {
      window.sessionStorage.setItem(
        'hh:drill',
        JSON.stringify({
          questions,
          sourceInterviewId: card.id,
          headline: card.headline,
          persona: card.persona,
          track: card.track,
          role: card.role,
          topic: card.topic,
          projectName: card.projectName,
        }),
      );
      router.push('/start?drill=1');
    } catch {
      notify({ title: 'Could not start the drill', tone: 'error' });
    }
  }, [card, notify, router, selected]);

  const weakest = useMemo(() => {
    if (!card) return [];
    return card.turns
      .filter(turn => turn.answered && turn.score != null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 2)
      .map(turn => turn.index);
  }, [card]);

  if (error) {
    return (
      <GlassCard className="mx-auto mt-16 max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-fg">Scorecard unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
        <ButtonLink href="/start" variant="primary" className="mt-5">
          Start a new interview
        </ButtonLink>
      </GlassCard>
    );
  }

  if (!card) {
    return <p className="py-32 text-center text-sm text-muted">Adding up your scores…</p>;
  }

  const needsReflection = card.status !== 'finished';
  const delta = card.confidenceDelta;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <GlassCard strong className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Chip tone="mint">{TRACKS[card.track].short}</Chip>
              <Chip tone="iris">{PERSONAS[card.persona].label}</Chip>
              {card.drill && <Chip tone="amber">Retry drill</Chip>}
              {card.endedEarly && <Chip tone="rose">Ended early</Chip>}
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              {card.headline}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {formatDate(card.createdAt)} · {card.answeredCount} of {card.questionCount} answered ·{' '}
              {card.engine === 'llm' ? 'AI-scored' : 'Rule-based scoring'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={card.overallScore} label={card.band} />
          </div>
        </div>

        <div className="no-print mt-6 flex flex-wrap gap-2 border-t border-white/6 pt-5">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              downloadText(`${slugify(card.headline)}-scorecard.md`, scorecardToMarkdown(card));
            }}
          >
            <Download className="size-4" /> Markdown
          </Button>
          <Button variant="glass" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / PDF
          </Button>
          {!isLocalId(card.id) && (
            <Button
              variant="glass"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  notify({ title: 'Link copied', description: 'Anyone with the link can read this scorecard.' });
                } catch {
                  notify({ title: 'Could not copy the link', tone: 'error' });
                }
              }}
            >
              <Link2 className="size-4" /> Copy link
            </Button>
          )}
          <ButtonLink href="/start" variant="ghost" size="sm">
            New interview <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </GlassCard>

      <>
        {needsReflection && (
          <div className="rise-in">
            <ClickSpark sparkColor="#6ff0c6" sparkCount={10} sparkRadius={18}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-mint" />
                  <h2 className="text-base font-semibold text-fg">One last thing</h2>
                </div>
                <p className="mt-1 text-sm text-muted">
                  You started at {card.preConfidence}/10. How confident do you feel now?
                </p>

                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="font-mono text-2xl tabular-nums text-mint">{postConfidence}/10</p>
                  <ElasticSlider
                    value={postConfidence}
                    onChange={setPostConfidence}
                    startingValue={1}
                    maxValue={10}
                    isStepped
                    stepSize={1}
                    className="w-full max-w-md"
                    ariaLabel="Confidence after the interview"
                    leftIcon={<span className="text-xs text-subtle">1</span>}
                    rightIcon={<span className="text-xs text-subtle">10</span>}
                  />
                </div>

                <div className="mt-5">
                  <TextAreaField
                    label="One thing you will do differently next time"
                    placeholder="Lead with a one-line answer before the detail."
                    rows={2}
                    maxLength={600}
                    value={reflection}
                    onChange={event => setReflection(event.target.value)}
                  />
                </div>

                <Button variant="primary" className="mt-4 w-full sm:w-auto" loading={saving} onClick={() => void saveReflection()}>
                  Save and finish
                </Button>
              </GlassCard>
            </ClickSpark>
          </div>
        )}
      </>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">How you were scored</h2>
          {card.rubric ? (
            <div className="mt-4 space-y-4">
              {(['substance', 'clarity', 'depth'] as const).map(dimension => (
                <Meter
                  key={dimension}
                  value={card.rubric?.[dimension] ?? null}
                  label={RUBRIC_LABELS[dimension].label}
                  hint={RUBRIC_LABELS[dimension].help}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No answers were scored in this interview.</p>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">How you sounded</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile
              label="Pace"
              value={card.speech.avgWpm ? `${card.speech.avgWpm}` : '—'}
              hint={
                card.speech.avgWpm
                  ? card.speech.avgWpm > WPM_RANGE.max
                    ? 'Faster than the comfortable range'
                    : card.speech.avgWpm < WPM_RANGE.min
                      ? 'Slower than the comfortable range'
                      : 'Comfortable range'
                  : 'Answer by voice to measure this'
              }
            />
            <StatTile label="Filler words" value={card.speech.fillerCount} hint="um, basically, you know…" />
            <StatTile label="Words spoken" value={card.speech.totalWords} />
            <StatTile label="Speaking time" value={formatDuration(card.speech.speakingSeconds)} />
          </div>

          {card.postConfidence != null && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-subtle">Confidence</p>
                <p className="mt-1 font-mono text-lg tabular-nums text-fg">
                  {card.preConfidence} → {card.postConfidence}
                </p>
              </div>
              {delta != null && (
                <span
                  className="rounded-full px-3 py-1 font-mono text-sm font-semibold"
                  style={{
                    color: delta > 0 ? 'var(--color-mint)' : delta < 0 ? 'var(--color-rose)' : 'var(--color-muted)',
                    background:
                      delta > 0
                        ? 'color-mix(in oklab, var(--color-mint) 14%, transparent)'
                        : delta < 0
                          ? 'color-mix(in oklab, var(--color-rose) 14%, transparent)'
                          : 'transparent',
                  }}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-mint" />
            <h2 className="text-sm font-semibold text-fg">What went well</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {card.highlights.map(item => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint/80" />
                {item}
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-amber" />
            <h2 className="text-sm font-semibold text-fg">What to work on</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {card.focusAreas.map(item => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber/80" />
                {item}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-fg">Transcript</h2>
          <div className="no-print flex items-center gap-2">
            {selected.length > 0 && (
              <Button variant="primary" size="sm" onClick={startDrill}>
                <Repeat className="size-4" /> Retry {selected.length} as a drill
              </Button>
            )}
            {selected.length === 0 && weakest.length > 0 && (
              <Button variant="glass" size="sm" onClick={() => setSelected(weakest)}>
                <Repeat className="size-4" /> Select weakest answers
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {card.turns.map(turn => (
            <TurnRow
              key={turn.index}
              turn={turn}
              selected={selected.includes(turn.index)}
              onToggleSelect={() =>
                setSelected(current =>
                  current.includes(turn.index)
                    ? current.filter(index => index !== turn.index)
                    : [...current, turn.index],
                )
              }
            />
          ))}
        </div>
      </GlassCard>

      {!user && !isLocalId(card.id) && (
        <GlassCard className="no-print flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm font-medium text-fg">Keep this scorecard</p>
            <p className="mt-1 text-sm text-muted">
              Create a free account and your past interviews, streak and readiness follow you.
            </p>
          </div>
          <ButtonLink href="/login" variant="primary">
            Create an account
          </ButtonLink>
        </GlassCard>
      )}
    </div>
  );
}

function TurnRow({
  turn,
  selected,
  onToggleSelect,
}: {
  turn: TurnReview;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('well overflow-hidden rounded-2xl transition', selected && 'ring-1 ring-mint/50')}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold"
          style={{
            color: turn.score == null ? 'var(--color-subtle)' : scoreColor(turn.score),
            background:
              turn.score == null
                ? 'rgba(255,255,255,0.05)'
                : `color-mix(in oklab, ${scoreColor(turn.score)} 14%, transparent)`,
          }}
        >
          {turn.score ?? '—'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-subtle">
              Q{turn.index} · {ROUND_LABELS[turn.round]}
            </span>
            {turn.skipped && <Chip tone="rose">passed</Chip>}
            {turn.hintUsed && <Chip tone="amber">hint</Chip>}
            {!turn.answered && <Chip>not answered</Chip>}
          </span>
          <span className="mt-1 block truncate text-sm text-fg">{turn.question}</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-subtle transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="overflow-hidden">
          <div className="rise-in space-y-4 border-t border-white/6 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Your answer</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {turn.answered ? turn.answer || '(passed)' : '(not answered)'}
                </p>
              </div>

              {turn.feedback && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Ora</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg">{turn.feedback}</p>
                  {turn.tip && <p className="mt-1 text-sm leading-relaxed text-mint/90">{turn.tip}</p>}
                </div>
              )}

              {turn.outline.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    A strong answer covers
                  </p>
                  <ul className="mt-1 space-y-1">
                    {turn.outline.map(item => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-iris/70" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {turn.rubric && (
                  <>
                    <Chip tone="mint">Substance {turn.rubric.substance}</Chip>
                    <Chip tone="sky">Clarity {turn.rubric.clarity}</Chip>
                    <Chip tone="amber">Depth {turn.rubric.depth}</Chip>
                  </>
                )}
                {turn.wpm && <Chip>{turn.wpm} wpm</Chip>}
                {turn.wordCount != null && <Chip>{turn.wordCount} words</Chip>}
                <span className="grow" />
                <label className="no-print flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggleSelect}
                    className="size-3.5 accent-[var(--color-mint)]"
                  />
                  Retry this question
                </label>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
