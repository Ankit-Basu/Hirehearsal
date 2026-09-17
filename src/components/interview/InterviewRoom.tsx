'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, DoorOpen, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { OraAvatar, type OraState } from './OraAvatar';
import {
  AnswerComposer,
  FeedbackCard,
  ProgressRail,
  QuestionPanel,
  RoundHint,
  TimerRing,
} from './RoomPanels';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip, Kbd } from '@/components/ui/Controls';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { GlassCard } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { useCountdown } from '@/hooks/useCountdown';
import { useMicLevel } from '@/hooks/useMicLevel';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PERSONAS, TRACKS } from '@/lib/constants';
import { useEngine } from '@/lib/engine-status';
import { liveMetrics } from '@/lib/engine/analyzer';
import { upsertHistory } from '@/lib/history';
import { useSettings } from '@/lib/settings';
import { speak, stopSpeaking, type SpeechHandle } from '@/lib/speech/tts';
import { useSpeechRecognition } from '@/lib/speech/useSpeechRecognition';
import type { EvaluationView, QuestionView, Scorecard } from '@/lib/types';

type Phase = 'loading' | 'error' | 'lobby' | 'asking' | 'answering' | 'evaluating' | 'complete';

export function InterviewRoom({ id }: { id: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const { online } = useEngine();
  const { token } = useAuth();
  const { settings, update } = useSettings();

  const [phase, setPhase] = useState<Phase>('loading');
  const [card, setCard] = useState<Scorecard | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [answer, setAnswer] = useState('');
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationView | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const [oraState, setOraState] = useState<OraState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [opener, setOpener] = useState('');
  const [endOpen, setEndOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speechRef = useRef<SpeechHandle | null>(null);
  const answerStartedAt = useRef(0);
  const usedVoice = useRef(false);
  const usedTyping = useRef(false);
  const submitRef = useRef<(skipped?: boolean) => void>(() => {});

  const recognition = useSpeechRecognition(settings.recognitionLang, text => {
    usedVoice.current = true;
    setAnswer(current => (current ? `${current} ${text}` : text));
  });
  const { level } = useMicLevel(recognition.listening);

  const persona = card ? PERSONAS[card.persona] : PERSONAS.panelist;
  const metrics = useMemo(() => liveMetrics(`${answer} ${recognition.interim}`), [answer, recognition.interim]);

  // ── Load the interview and work out where it left off ──────────────
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');

    api
      .scorecard({ online, token }, id)
      .then(loaded => {
        if (cancelled) return;
        if (loaded.status !== 'in_progress') {
          router.replace(`/scorecard/${id}`);
          return;
        }
        const open = loaded.turns.find(turn => !turn.answered);
        if (!open) {
          router.replace(`/scorecard/${id}`);
          return;
        }
        setCard(loaded);
        setScores(
          Array.from({ length: loaded.questionCount }, (_, index) => loaded.turns[index]?.score ?? null),
        );
        setQuestion({ index: open.index, round: open.round, question: open.question });
        setHint(open.hint);
        setHintUsed(open.hintUsed);
        try {
          setOpener(window.sessionStorage.getItem(`hh:opener:${id}`) ?? '');
        } catch {
          setOpener('');
        }
        setPhase('lobby');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404
            ? 'This interview could not be found. It may have been taken on another device.'
            : 'Could not load this interview. Check that the API is running, then try again.',
        );
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id, online, token, router]);

  // Stop audio when leaving the room.
  useEffect(() => {
    return () => {
      speechRef.current?.cancel();
      stopSpeaking();
    };
  }, []);

  // A gentle stopwatch for the current answer.
  useEffect(() => {
    if (phase !== 'answering') return;
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - answerStartedAt.current) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [phase]);

  const say = useCallback(
    async (text: string) => {
      if (!settings.voiceEnabled || !text.trim()) return;
      speechRef.current?.cancel();
      setOraState('speaking');
      const handle = speak(text, {
        voiceURI: settings.voiceURI,
        rate: settings.speechRate * persona.rate,
        pitch: persona.pitch,
        lang: settings.recognitionLang,
      });
      speechRef.current = handle;
      await handle.done;
      setOraState('idle');
    },
    [persona.pitch, persona.rate, settings.recognitionLang, settings.speechRate, settings.voiceEnabled, settings.voiceURI],
  );

  const beginAnswering = useCallback(() => {
    setPhase('answering');
    setOraState('idle');
    setElapsed(0);
    answerStartedAt.current = Date.now();
    usedVoice.current = false;
    usedTyping.current = false;
    recognition.reset();
    if (settings.autoListen && recognition.supported) {
      recognition.start();
    }
  }, [recognition, settings.autoListen]);

  const begin = useCallback(async () => {
    if (!question) return;
    setPhase('asking');
    await say([opener, question.question].filter(Boolean).join(' '));
    beginAnswering();
  }, [beginAnswering, opener, question, say]);

  const submit = useCallback(
    async (skipped = false) => {
      if (!question || (phase !== 'answering' && phase !== 'asking')) return;
      const text = answer.trim();
      if (!skipped && text.length === 0) return;

      recognition.stop();
      speechRef.current?.cancel();
      setPhase('evaluating');
      setOraState('thinking');

      const durationSeconds = Math.min(3600, Math.round((Date.now() - answerStartedAt.current) / 1000));
      const speakingSeconds = Math.min(3600, recognition.speakingSeconds());
      const inputMode =
        usedVoice.current && usedTyping.current ? 'mixed' : usedVoice.current ? 'voice' : 'text';

      try {
        const result = await api.answer({ online, token }, id, {
          index: question.index,
          answer: skipped ? '' : text,
          skipped,
          metrics: { durationSeconds, speakingSeconds, inputMode },
        });

        setLastEvaluation(result.evaluation);
        setScores(current => {
          const next = [...current];
          next[question.index - 1] = result.evaluation.score;
          return next;
        });
        setAnswer('');
        setHint(null);
        setHintUsed(false);

        if (card) {
          upsertHistory({
            id,
            source: id.startsWith('local-') ? 'local' : 'api',
            track: card.track,
            persona: card.persona,
            headline: card.headline,
            status: result.completed ? 'awaiting_reflection' : 'in_progress',
            questionCount: card.questionCount,
            answeredCount: question.index,
            overallScore: null,
            confidenceDelta: null,
            drill: card.drill,
            createdAt: card.createdAt,
          });
        }

        if (result.next) {
          setQuestion(result.next);
          setPhase('asking');
          await say(`${result.evaluation.feedback} ${result.next.question}`);
          beginAnswering();
        } else {
          setPhase('complete');
          await say(`${result.evaluation.feedback} That was the last question. Let us look at your scorecard.`);
        }
      } catch (caught: unknown) {
        setPhase('answering');
        setOraState('idle');
        if (!skipped) setAnswer(text);
        notify({
          title: 'That answer did not go through',
          description: caught instanceof ApiError ? caught.message : 'Check your connection and try again.',
          tone: 'error',
        });
      }
    },
    [answer, beginAnswering, card, id, notify, online, phase, question, recognition, say, token],
  );

  submitRef.current = submit;

  const requestHint = useCallback(async () => {
    if (!question || hintUsed) return;
    try {
      const result = await api.hint({ online, token }, id, question.index);
      setHint(result.hint);
      setHintUsed(true);
    } catch (caught: unknown) {
      notify({
        title: 'No hint available',
        description: caught instanceof ApiError ? caught.message : 'Try again in a moment.',
        tone: 'error',
      });
    }
  }, [hintUsed, id, notify, online, question, token]);

  const repeatQuestion = useCallback(() => {
    if (question) void say(question.question);
  }, [question, say]);

  const toggleMic = useCallback(() => {
    if (recognition.listening) {
      recognition.stop();
    } else {
      speechRef.current?.cancel();
      recognition.start();
    }
  }, [recognition]);

  // Keyboard shortcuts, kept in refs so they never capture stale state.
  const handlers = useRef({ submit, requestHint, repeatQuestion, toggleMic });
  handlers.current = { submit, requestHint, repeatQuestion, toggleMic };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        speechRef.current?.cancel();
        setOraState('idle');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handlers.current.submit();
        return;
      }
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'm') {
        event.preventDefault();
        handlers.current.toggleMic();
      } else if (key === 'h') {
        event.preventDefault();
        void handlers.current.requestHint();
      } else if (key === 'r') {
        event.preventDefault();
        handlers.current.repeatQuestion();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (phase === 'loading') {
    return <p className="py-32 text-center text-sm text-muted">Opening the interview room…</p>;
  }

  if (phase === 'error' || !card || !question) {
    return (
      <GlassCard className="mx-auto mt-16 max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-fg">We could not open this interview</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <ButtonLink href="/start" variant="primary">
            Start a new interview
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="ghost">
            Your progress
          </ButtonLink>
        </div>
      </GlassCard>
    );
  }

  const busy = phase === 'evaluating';
  const timerActive = settings.timerSeconds > 0 && phase === 'answering';

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top bar */}
      <GlassCard className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{card.headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip tone="mint">{TRACKS[card.track].short}</Chip>
            <Chip tone="iris">{persona.label}</Chip>
            {card.drill && <Chip tone="amber">Drill</Chip>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProgressRail total={card.questionCount} current={question.index} scores={scores} />
          {timerActive && (
            <AnswerTimer
              key={question.index}
              seconds={settings.timerSeconds}
              running={phase === 'answering'}
              onExpire={() => submitRef.current(answer.trim().length === 0)}
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              update({ voiceEnabled: !settings.voiceEnabled });
              if (settings.voiceEnabled) {
                speechRef.current?.cancel();
                setOraState('idle');
              }
            }}
            aria-label={settings.voiceEnabled ? 'Mute Ora' : 'Unmute Ora'}
          >
            {settings.voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEndOpen(true)}>
            <DoorOpen className="size-4" /> End
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        {/* Ora */}
        <GlassCard className="flex flex-col items-center gap-4 p-5 lg:sticky lg:top-24 lg:self-start">
          <OraAvatar
            persona={card.persona}
            state={oraState}
            level={level}
            size={230}
            className="hidden sm:block"
          />
          <OraAvatar persona={card.persona} state={oraState} level={level} size={150} className="sm:hidden" />

          <div className="text-center">
            <p className="text-sm font-medium text-fg">Ora</p>
            <p className="text-xs text-subtle">
              {oraState === 'speaking'
                ? 'Asking your question'
                : oraState === 'thinking'
                  ? 'Reading your answer'
                  : recognition.listening
                    ? 'Listening'
                    : persona.label}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={repeatQuestion} disabled={busy} title="Alt + R">
              <RotateCcw className="size-3.5" /> Repeat
            </Button>
          </div>

          <div className="hidden w-full border-t border-white/6 pt-3 lg:block">
            <RoundHint round={question.round} />
            <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] text-subtle">
              <span className="flex items-center gap-1">
                <Kbd>Alt</Kbd>+<Kbd>M</Kbd> mic
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Alt</Kbd>+<Kbd>H</Kbd> hint
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> submit
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Question and answer */}
        <div className="space-y-4">
          <div>
            {phase === 'lobby' ? (
              <div className="rise-in">
                <GlassCard className="p-6 text-center">
                  <h1 className="text-xl font-semibold text-fg">
                    {question.index === 1 ? 'Ready when you are' : `Resume at question ${question.index}`}
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                    {opener ||
                      `${card.questionCount} questions with ${persona.label}. Answer out loud; Ora scores substance, clarity and depth.`}
                  </p>
                  <Button variant="primary" size="lg" className="mt-6" onClick={() => void begin()}>
                    {question.index === 1 ? 'Begin interview' : 'Continue'} <ArrowRight className="size-4" />
                  </Button>
                  <p className="mt-3 text-xs text-subtle">
                    Ora is an AI interviewer. Nothing here is a hiring decision.
                  </p>
                </GlassCard>
              </div>
            ) : phase === 'complete' ? (
              <div className="rise-in">
                <GlassCard strong className="p-8 text-center">
                  <h1 className="text-2xl font-semibold text-fg">Interview complete</h1>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                    You answered {card.questionCount} questions. Now rate how you feel and read the scorecard.
                  </p>
                  {lastEvaluation && (
                    <div className="mx-auto mt-5 max-w-md text-left">
                      <FeedbackCard evaluation={lastEvaluation} />
                    </div>
                  )}
                  <ButtonLink href={`/scorecard/${id}`} variant="primary" size="lg" className="mt-6">
                    See your scorecard <ArrowRight className="size-4" />
                  </ButtonLink>
                </GlassCard>
              </div>
            ) : (
              <div className="space-y-4">
                <QuestionPanel
                  question={question}
                  total={card.questionCount}
                  hint={hint}
                  thinking={phase === 'evaluating'}
                />

                <AnswerComposer
                  value={answer}
                  interim={recognition.interim}
                  onChange={value => {
                    usedTyping.current = true;
                    setAnswer(value);
                  }}
                  onSubmit={() => void submit()}
                  onPass={() => void submit(true)}
                  onHint={() => void requestHint()}
                  onToggleMic={toggleMic}
                  listening={recognition.listening}
                  micSupported={recognition.supported}
                  micLevel={level}
                  busy={busy}
                  hintUsed={hintUsed}
                  words={metrics.words}
                  fillers={metrics.fillers}
                  elapsed={elapsed}
                />

                {recognition.error && <p className="px-1 text-xs text-amber">{recognition.error}</p>}

                {lastEvaluation && <FeedbackCard evaluation={lastEvaluation} />}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={() => {
          speechRef.current?.cancel();
          recognition.stop();
          router.push(`/scorecard/${id}`);
        }}
        title="End the interview here?"
        description="You will still get a scorecard for the questions you answered."
        confirmLabel="End interview"
        tone="danger"
      />
    </div>
  );
}

function AnswerTimer({
  seconds,
  running,
  onExpire,
}: {
  seconds: number;
  running: boolean;
  onExpire: () => void;
}) {
  const remaining = useCountdown(seconds, running, onExpire);
  return <TimerRing remaining={remaining} total={seconds} />;
}
