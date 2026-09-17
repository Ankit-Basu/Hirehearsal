'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Flame, Target, Timer, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Chip, Segmented } from '@/components/ui/Controls';
import { ActivityBars, Meter, Sparkline, StatTile } from '@/components/ui/DataViz';
import { EmptyState, GlassCard, SectionHeading } from '@/components/ui/Surface';
import { remote } from '@/lib/api/remote';
import { useAuth } from '@/lib/auth';
import { PERSONAS, ROUND_LABELS, RUBRIC_LABELS, TRACKS } from '@/lib/constants';
import { useEngine } from '@/lib/engine-status';
import { localProgress } from '@/lib/engine/progress';
import { formatRelative, scoreColor } from '@/lib/format';
import { listHistory } from '@/lib/history';
import { useSettings } from '@/lib/settings';
import type { Insights, InterviewSummary, Progress } from '@/lib/types';

export function DashboardView() {
  const { user, token } = useAuth();
  const { online } = useEngine();
  const { settings } = useSettings();
  const [tab, setTab] = useState<'you' | 'community'>('you');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const history = useMemo(() => (typeof window === 'undefined' ? [] : listHistory()), []);

  useEffect(() => {
    let cancelled = false;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const load = async () => {
      if (user && token && online) {
        try {
          const server = await remote.progress(token, timeZone);
          if (!cancelled) setProgress(server);
        } catch {
          if (!cancelled) setProgress(localProgress(history, settings.weeklyGoal));
        }
      } else {
        setProgress(localProgress(history, user?.weeklyGoal ?? settings.weeklyGoal));
      }
      if (!cancelled) setLoading(false);
    };

    void load();
    remote
      .insights()
      .then(value => {
        if (!cancelled) setInsights(value);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [history, online, settings.weeklyGoal, token, user]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={user ? `Signed in as ${user.name}` : 'Your practice'}
          title="Interview readiness"
          description="Readiness weights your five most recent interviews, so recent work counts most."
        />
        <Segmented
          className="w-auto shrink-0"
          size="sm"
          ariaLabel="Dashboard view"
          options={[
            { value: 'you', label: 'You' },
            { value: 'community', label: 'Community' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'you' ? (
        loading ? (
          <p className="py-20 text-center text-sm text-muted">Loading your progress…</p>
        ) : progress && progress.totals.interviews > 0 ? (
          <YouTab progress={progress} />
        ) : (
          <GlassCard className="p-6">
            <EmptyState
              icon={<Activity className="size-8" />}
              title="No interviews yet"
              description="Run your first mock interview and this page fills up with scores, streaks and trends."
              action={
                <ButtonLink href="/start" variant="primary" className="mt-2">
                  Start your first interview <ArrowRight className="size-4" />
                </ButtonLink>
              }
            />
          </GlassCard>
        )
      ) : (
        <CommunityTab insights={insights} />
      )}
    </div>
  );
}

function YouTab({ progress }: { progress: Progress }) {
  const goalFraction = Math.min(1, progress.weekly.completed / Math.max(1, progress.weekly.goal));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <GlassCard strong className="flex items-center gap-6 p-6">
          <div className="relative grid size-28 shrink-0 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90 size-28">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={scoreColor(progress.readiness / 10)}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - progress.readiness / 100)}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="text-center">
              <p className="font-mono text-2xl font-semibold tabular-nums text-fg">
                {progress.readiness}
              </p>
              <p className="text-[0.6rem] uppercase tracking-wider text-subtle">/ 100</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Readiness</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {progress.readiness >= 80
                ? 'Interview-ready. Keep the reps light and stay warm.'
                : progress.readiness >= 60
                  ? 'Solid. Target your weakest round next.'
                  : progress.readiness > 0
                    ? 'Early days. Two interviews a week moves this fast.'
                    : 'Finish an interview to get your first score.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['technical', 'project', 'hr'] as const).map(round => (
                <Chip key={round} tone={progress.readinessByRound[round] == null ? 'neutral' : 'mint'}>
                  {ROUND_LABELS[round]} {progress.readinessByRound[round] ?? '—'}
                </Chip>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4">
          <StatTile
            label="Streak"
            value={`${progress.streakDays}d`}
            hint={progress.practicedToday ? 'Practised today' : 'Practise today to extend it'}
            icon={<Flame className="size-4" />}
          />
          <StatTile
            label="This week"
            value={`${progress.weekly.completed}/${progress.weekly.goal}`}
            hint={goalFraction >= 1 ? 'Goal reached' : 'Interviews towards your goal'}
            icon={<Target className="size-4" />}
          />
          <StatTile label="Answers scored" value={progress.totals.answers} icon={<Activity className="size-4" />} />
          <StatTile
            label="Speaking time"
            value={`${progress.totals.minutesSpoken}m`}
            icon={<Timer className="size-4" />}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">Score trend</h2>
          <p className="mt-1 text-xs text-subtle">Your last {progress.trend.length} scored interviews</p>
          <div className="mt-4">
            <Sparkline points={progress.trend.map(point => point.overallScore)} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">Rubric average</h2>
          {progress.rubric ? (
            <div className="mt-4 space-y-3">
              {(['substance', 'clarity', 'depth'] as const).map(dimension => (
                <Meter
                  key={dimension}
                  value={progress.rubric?.[dimension] ?? null}
                  label={RUBRIC_LABELS[dimension].label}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Finish an interview to see your rubric averages.</p>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-fg">Recent interviews</h2>
        <div className="space-y-2">
          {progress.recent.map(item => (
            <InterviewRow key={item.id} interview={item} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function InterviewRow({ interview }: { interview: InterviewSummary }) {
  const href = interview.status === 'in_progress' ? `/room/${interview.id}` : `/scorecard/${interview.id}`;
  return (
    <Link
      href={href}
      className="well flex items-center gap-3 rounded-2xl p-3 transition hover:border-white/15"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold"
        style={{
          color: interview.overallScore == null ? 'var(--color-subtle)' : scoreColor(interview.overallScore),
          background:
            interview.overallScore == null
              ? 'rgba(255,255,255,0.05)'
              : `color-mix(in oklab, ${scoreColor(interview.overallScore)} 14%, transparent)`,
        }}
      >
        {interview.overallScore ?? '—'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{interview.headline}</span>
        <span className="mt-0.5 block text-xs text-subtle">
          {formatRelative(interview.createdAt)} · {TRACKS[interview.track].short} ·{' '}
          {PERSONAS[interview.persona].label} · {interview.answeredCount}/{interview.questionCount} answered
        </span>
      </span>
      {interview.status === 'in_progress' && <Chip tone="amber">Resume</Chip>}
      <ArrowRight className="size-4 shrink-0 text-subtle" />
    </Link>
  );
}

function CommunityTab({ insights }: { insights: Insights | null }) {
  if (!insights) {
    return (
      <GlassCard className="p-6">
        <EmptyState
          icon={<Users className="size-8" />}
          title="Community stats need the API"
          description="Start the Spring Boot API to see anonymous aggregates across everyone practising."
        />
      </GlassCard>
    );
  }

  const trackEntries = Object.entries(insights.tracks).filter(([, count]) => count > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Interviews" value={insights.totals.interviews} />
        <StatTile label="Answers scored" value={insights.totals.answers} />
        <StatTile label="Completion" value={`${insights.totals.completionRate}%`} />
        <StatTile
          label="Avg confidence gain"
          value={`${(insights.averages.confidenceDelta ?? 0) > 0 ? '+' : ''}${insights.averages.confidenceDelta ?? 0}`}
        />
      </div>

      <GlassCard className="p-6">
        <h2 className="text-sm font-semibold text-fg">Last 14 days</h2>
        <div className="mt-4">
          <ActivityBars data={insights.daily.map(day => ({ date: day.date, value: day.interviews }))} />
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">Popular focus areas</h2>
          {insights.popularFocusAreas.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No technical interviews yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {insights.popularFocusAreas.map(area => (
                <li key={area.topic} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{area.topic}</span>
                  <span className="font-mono text-xs text-subtle">{area.interviews}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-fg">Rounds people practise</h2>
          <div className="mt-3 space-y-2">
            {trackEntries.map(([track, count]) => (
              <div key={track} className="flex items-center justify-between text-sm">
                <span className="text-muted">{TRACKS[track as keyof typeof TRACKS]?.short ?? track}</span>
                <span className="font-mono text-xs text-subtle">{count}</span>
              </div>
            ))}
          </div>
          {insights.averages.wpm && (
            <p className="mt-4 text-xs text-subtle">
              Average speaking pace across everyone: {insights.averages.wpm} wpm
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
