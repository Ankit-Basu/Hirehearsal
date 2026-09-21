'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Layers, Mic, Repeat, Sparkles, Users } from 'lucide-react';
import ElasticSlider from '@/components/reactbits/ElasticSlider';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import Stepper, { Step } from '@/components/reactbits/Stepper';
import { Button } from '@/components/ui/Button';
import { Chip, Segmented, Switch } from '@/components/ui/Controls';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { MicCheck } from './MicCheck';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { PERSONAS, QUESTION_COUNTS, TIMER_OPTIONS, TRACKS } from '@/lib/constants';
import { useEngine } from '@/lib/engine-status';
import { bank } from '@/lib/engine/bank';
import { upsertHistory } from '@/lib/history';
import { PACKS } from '@/lib/presets';
import { useSettings } from '@/lib/settings';
import { KEYS, readJson, writeJson } from '@/lib/storage';
import type { DrillQuestion, Persona, Track } from '@/lib/types';

interface SetupState {
  track: Track;
  persona: Persona;
  role: string;
  topic: string;
  projectName: string;
  projectSummary: string;
  jobDescription: string;
  questionCount: number;
  preConfidence: number;
}

interface DrillPayload {
  questions: DrillQuestion[];
  sourceInterviewId: string;
  headline: string;
  persona: Persona;
  track: Track;
  role?: string | null;
  topic?: string | null;
  projectName?: string | null;
}

const DEFAULTS: SetupState = {
  track: 'technical',
  persona: 'panelist',
  role: '',
  topic: '',
  projectName: '',
  projectSummary: '',
  jobDescription: '',
  questionCount: 5,
  preConfidence: 5,
};

const ROLE_SUGGESTIONS = [
  'SDE Intern',
  'Software Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full-stack Developer',
  'Data Analyst',
];

const TRACK_ICONS = { technical: Sparkles, project: Layers, hr: Users, mixed: Repeat } as const;

export function SetupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { notify } = useToast();
  const { online } = useEngine();
  const { token } = useAuth();
  const { settings, update } = useSettings();

  const [state, setState] = useState<SetupState>(DEFAULTS);
  const [drill, setDrill] = useState<DrillPayload | null>(null);
  const [starting, setStarting] = useState(false);
  const [step, setStep] = useState(1);

  // Restore the last setup, then let query params and drill payloads take priority.
  useEffect(() => {
    const saved = readJson<Partial<SetupState>>(KEYS.lastSetup, {});
    const fromQuery: Partial<SetupState> = {};
    const track = params.get('track');
    if (track && track in TRACKS) fromQuery.track = track as Track;
    const persona = params.get('persona');
    if (persona && persona in PERSONAS) fromQuery.persona = persona as Persona;
    const topic = params.get('topic');
    if (topic) fromQuery.topic = topic;
    const role = params.get('role');
    if (role) fromQuery.role = role;

    const pack = PACKS.find(entry => entry.id === params.get('pack'));
    const fromPack: Partial<SetupState> = pack
      ? {
          track: pack.track,
          persona: pack.persona,
          questionCount: pack.questionCount,
          role: pack.role ?? '',
          topic: pack.topic ?? '',
        }
      : {};

    let drillPayload: DrillPayload | null = null;
    if (params.get('drill') === '1' && typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem('hh:drill');
        drillPayload = raw ? (JSON.parse(raw) as DrillPayload) : null;
      } catch {
        drillPayload = null;
      }
    }

    setState(current => ({
      ...current,
      ...saved,
      ...fromPack,
      ...fromQuery,
      ...(drillPayload
        ? {
            track: drillPayload.track,
            persona: drillPayload.persona,
            role: drillPayload.role ?? '',
            topic: drillPayload.topic ?? '',
            projectName: drillPayload.projectName ?? '',
          }
        : {}),
    }));
    setDrill(drillPayload);
  }, [params]);

  const set = useCallback(<K extends keyof SetupState>(key: K, value: SetupState[K]) => {
    setState(current => ({ ...current, [key]: value }));
  }, []);

  const needsTopic = state.track === 'technical' || state.track === 'mixed';
  const detailsValid = drill
    ? true
    : state.track === 'project'
      ? state.projectName.trim().length > 0
      : needsTopic
        ? state.topic.trim().length > 0 || state.jobDescription.trim().length > 0
        : true;

  const startInterview = useCallback(async () => {
    setStarting(true);
    try {
      const started = await api.start(
        { online, token },
        {
          track: state.track,
          persona: state.persona,
          role: state.role || null,
          topic: state.topic || null,
          projectName: state.projectName || null,
          projectSummary: state.projectSummary || null,
          jobDescription: state.jobDescription || null,
          questionCount: state.questionCount,
          preConfidence: state.preConfidence,
          questions: drill?.questions,
          sourceInterviewId: drill?.sourceInterviewId ?? null,
        },
      );

      writeJson(KEYS.lastSetup, { ...state });
      upsertHistory({
        id: started.id,
        source: started.id.startsWith('local-') ? 'local' : 'api',
        track: started.track,
        persona: started.persona,
        headline: started.headline,
        status: 'in_progress',
        questionCount: started.questionCount,
        answeredCount: 0,
        overallScore: null,
        confidenceDelta: null,
        drill: started.drill,
        createdAt: started.createdAt,
      });

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('hh:drill');
        // The room reads the opener from here so Ora can greet immediately.
        window.sessionStorage.setItem(`hh:opener:${started.id}`, started.opener);
      }
      router.push(`/room/${started.id}`);
    } catch (error) {
      setStarting(false);
      notify({
        title: 'Could not start the interview',
        description: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
        tone: 'error',
      });
    }
  }, [drill, notify, online, router, state, token]);

  const topicSuggestions = useMemo(() => bank.technical.topics.map(topic => topic.label), []);

  if (drill) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <GlassCard className="p-6 sm:p-8">
          <span className="chip mb-4 gap-2 text-mint">
            <Repeat className="size-3.5" /> Retry drill
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {drill.questions.length} question{drill.questions.length === 1 ? '' : 's'} from {drill.headline}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Same questions, fresh attempt. Answer them again and compare the scores.
          </p>

          <ol className="mt-5 space-y-2">
            {drill.questions.map((question, index) => (
              <li key={index} className="well rounded-xl p-3 text-sm text-muted">
                <span className="mr-2 font-mono text-xs text-subtle">Q{index + 1}</span>
                {question.question}
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <PersonaPicker value={state.persona} onChange={value => set('persona', value)} />
          </div>

          <div className="mt-6">
            <ConfidenceStep
              value={state.preConfidence}
              onChange={value => set('preConfidence', value)}
              compact
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            loading={starting}
            onClick={() => void startInterview()}
          >
            Start the drill <ArrowRight className="size-4" />
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Set up your interview</h1>
        <p className="mt-2 text-sm text-muted">Four quick choices and Ora is ready.</p>
      </div>

      <Stepper
        initialStep={1}
        onStepChange={setStep}
        backButtonText="Back"
        nextButtonText="Continue"
        completeButtonText={starting ? 'Starting…' : 'Enter the room'}
        stepCircleContainerClassName="glass max-w-2xl rounded-3xl"
        nextButtonProps={
          step === 4
            ? { onClick: () => void startInterview(), disabled: starting }
            : { disabled: step === 2 && !detailsValid }
        }
      >
        <Step>
          <StepHeader title="What are you practising?" hint="Step 1 of 4" />
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Quick packs</p>
            <div className="flex flex-wrap gap-2">
              {PACKS.map(pack => (
                <Chip
                  key={pack.id}
                  title={pack.blurb}
                  onClick={() =>
                    setState(current => ({
                      ...current,
                      track: pack.track,
                      persona: pack.persona,
                      questionCount: pack.questionCount,
                      role: pack.role ?? current.role,
                      topic: pack.topic ?? '',
                    }))
                  }
                >
                  {pack.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(TRACKS) as Track[]).map(track => {
              const meta = TRACKS[track];
              const Icon = TRACK_ICONS[track];
              const selected = state.track === track;
              return (
                <SpotlightCard
                  key={track}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => set('track', track)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      set('track', track);
                    }
                  }}
                  spotlightColor="rgba(111, 240, 198, 0.12)"
                  className={cn(
                    'cursor-pointer rounded-2xl border bg-transparent p-4 transition',
                    selected ? 'border-mint/60 bg-mint/6' : 'glass border-white/9 hover:border-white/20',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('mt-0.5 size-5', selected ? 'text-mint' : 'text-muted')} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{meta.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{meta.blurb}</p>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </Step>

        <Step>
          <StepHeader title="Tell Ora what to ask about" hint="Step 2 of 4" />
          <div className="space-y-4">
            {needsTopic && (
              <>
                <TextField
                  label="Technical focus"
                  placeholder="DBMS, Operating Systems, System Design…"
                  value={state.topic}
                  onChange={event => set('topic', event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {topicSuggestions.map(label => (
                    <Chip key={label} selected={state.topic === label} onClick={() => set('topic', label)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            {(state.track === 'project' || state.track === 'mixed') && (
              <>
                <TextField
                  label={state.track === 'project' ? 'Project name' : 'Project name (optional)'}
                  placeholder="Hirehearsal"
                  value={state.projectName}
                  onChange={event => set('projectName', event.target.value)}
                />
                <TextAreaField
                  label="What does it do?"
                  placeholder="An AI mock interview platform. Spring Boot API, Next.js front end, Postgres. I built the backend and the scoring engine."
                  rows={3}
                  maxLength={1500}
                  value={state.projectSummary}
                  onChange={event => set('projectSummary', event.target.value)}
                  hint={`${state.projectSummary.length}/1500`}
                />
              </>
            )}

            {(state.track === 'hr' || state.track === 'mixed') && (
              <>
                <TextField
                  label={state.track === 'hr' ? 'Target role' : 'Target role (optional)'}
                  placeholder="SDE Intern"
                  value={state.role}
                  onChange={event => set('role', event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {ROLE_SUGGESTIONS.map(role => (
                    <Chip key={role} selected={state.role === role} onClick={() => set('role', role)}>
                      {role}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            <TextAreaField
              label="Job description (optional)"
              placeholder="Paste the JD and Ora pulls questions from the skills it mentions."
              rows={3}
              maxLength={4000}
              value={state.jobDescription}
              onChange={event => set('jobDescription', event.target.value)}
              hint={`${state.jobDescription.length}/4000`}
            />

            {!detailsValid && (
              <p className="text-xs text-amber">
                {state.track === 'project'
                  ? 'Add the project name you want to defend.'
                  : 'Add a technical focus or paste a job description.'}
              </p>
            )}
          </div>
        </Step>

        <Step>
          <StepHeader title="Who is interviewing you?" hint="Step 3 of 4" />
          <PersonaPicker value={state.persona} onChange={value => set('persona', value)} />

          <div className="mt-6 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-fg">Questions</p>
              <Segmented
                ariaLabel="Number of questions"
                options={QUESTION_COUNTS.map(count => ({ value: count, label: String(count) }))}
                value={state.questionCount}
                onChange={value => set('questionCount', value)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-fg">Answer timer</p>
              <Segmented
                ariaLabel="Answer timer"
                options={TIMER_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                value={settings.timerSeconds}
                onChange={value => update({ timerSeconds: value })}
              />
              <p className="mt-2 text-xs text-subtle">
                A countdown per answer. When it runs out, your answer is submitted as it stands.
              </p>
            </div>

            <Switch
              checked={settings.voiceEnabled}
              onChange={value => update({ voiceEnabled: value })}
              label="Ora reads questions aloud"
              description="Turn this off for a silent, text-only interview."
            />
          </div>
        </Step>

        <Step>
          <StepHeader title="Before we start" hint="Step 4 of 4" />
          <ConfidenceStep value={state.preConfidence} onChange={value => set('preConfidence', value)} />

          <div className="mt-5 space-y-4">
            <MicCheck />

            <div className="well rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Your setup</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip tone="mint">{TRACKS[state.track].short}</Chip>
                <Chip tone="iris">{PERSONAS[state.persona].label}</Chip>
                <Chip>{state.questionCount} questions</Chip>
                {settings.timerSeconds > 0 && <Chip>{settings.timerSeconds}s per answer</Chip>}
                {state.topic && <Chip>{state.topic}</Chip>}
                {state.projectName && <Chip>{state.projectName}</Chip>}
                {state.role && <Chip>{state.role}</Chip>}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-subtle">
              Ora is an AI interviewer, not a person. Your answers are scored to help you practise; they are
              not a hiring decision. {online ? '' : 'The API is unreachable, so this interview runs in your browser.'}
            </p>
          </div>
        </Step>
      </Stepper>

      <p className="mt-4 text-center text-xs text-subtle">
        <Mic className="mr-1 inline size-3" />
        Works with voice in Chrome and Edge. You can always type instead.
      </p>
    </div>
  );
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-subtle">{hint}</p>
      <h2 className="mt-1 text-lg font-semibold text-fg">{title}</h2>
    </div>
  );
}

function PersonaPicker({ value, onChange }: { value: Persona; onChange: (persona: Persona) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(Object.keys(PERSONAS) as Persona[]).map(key => {
        const persona = PERSONAS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              selected ? 'border-mint/60 bg-mint/8' : 'glass border-white/9 hover:border-white/20',
            )}
          >
            <span
              className="mb-3 block size-7 rounded-full"
              style={{
                background: `radial-gradient(circle at 32% 30%, ${persona.accent}, transparent 72%), radial-gradient(circle at 70% 72%, var(--color-iris), transparent 68%)`,
                boxShadow: `0 0 16px -6px ${persona.accent}`,
              }}
            />
            <p className="text-sm font-semibold text-fg">{persona.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{persona.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}

function ConfidenceStep({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const labels = ['Shaky', 'Finding my feet', 'Steady', 'Confident', 'Ready for the room'];
  const label = labels[Math.min(labels.length - 1, Math.floor((value - 1) / 2))];

  return (
    <div className="well rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-fg">
          {compact ? 'Confidence right now' : 'How confident do you feel right now?'}
        </p>
        <p className="font-mono text-lg tabular-nums text-mint">{value}/10</p>
      </div>
      <div className="mt-2 flex justify-center">
        <ElasticSlider
          value={value}
          onChange={onChange}
          startingValue={1}
          maxValue={10}
          isStepped
          stepSize={1}
          className="w-full max-w-md"
          ariaLabel="Confidence before the interview"
          ariaValueText={current => `${current} out of 10`}
          leftIcon={<span className="text-xs text-subtle">1</span>}
          rightIcon={<span className="text-xs text-subtle">10</span>}
        />
      </div>
      <p className="mt-1 text-center text-xs text-muted">{label}</p>
      {!compact && (
        <p className="mt-2 text-center text-xs text-subtle">
          You will rate this again afterwards. The change is the point.
        </p>
      )}
    </div>
  );
}
