'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Gauge,
  Layers,
  Mic,
  Repeat,
  ShieldCheck,
  Sparkles,
  Timer,
  WifiOff,
} from 'lucide-react';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import GlareHover from '@/components/reactbits/GlareHover';
import LogoLoop from '@/components/reactbits/LogoLoop';
import Magnet from '@/components/reactbits/Magnet';
import RotatingText from '@/components/reactbits/RotatingText';
import ShinyText from '@/components/reactbits/ShinyText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import { OraAvatar } from '@/components/interview/OraAvatar';
import { ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Controls';
import { RevealText } from '@/components/ui/RevealText';
import { GlassCard, SectionHeading } from '@/components/ui/Surface';
import { remote } from '@/lib/api/remote';
import { PERSONAS, TRACKS } from '@/lib/constants';
import type { Insights, Persona } from '@/lib/types';

const ROTATING = ['technical round', 'project deep-dive', 'HR round', 'full interview loop'];

const TOPICS = [
  'DBMS & SQL',
  'Operating Systems',
  'Computer Networks',
  'DSA',
  'OOP & Design Patterns',
  'System Design',
  'Java & Spring Boot',
  'JavaScript & React',
  'Machine Learning',
  'Cloud & DevOps',
  'Tell me about yourself',
  'Project deep-dive',
];

export function Landing() {
  return (
    <div className="mx-auto max-w-6xl">
      <Hero />
      <Marquee />
      <AnimatedContent distance={70} duration={0.9} threshold={0.15}>
        <HowItWorks />
      </AnimatedContent>
      <AnimatedContent distance={70} duration={0.9} threshold={0.15}>
        <Features />
      </AnimatedContent>
      <AnimatedContent distance={70} duration={0.9} threshold={0.15}>
        <Personas />
      </AnimatedContent>
      <AnimatedContent distance={50} duration={0.8} threshold={0.2}>
        <CommunityStrip />
      </AnimatedContent>
      <AnimatedContent distance={60} duration={0.9} threshold={0.15} scale={0.97}>
        <FinalCta />
      </AnimatedContent>
    </div>
  );
}

function Hero() {
  return (
    <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-14">
      <div>
        <span className="chip mb-6 gap-2 px-3 py-1.5">
          <Sparkles className="size-3.5 text-mint" />
          <ShinyText text="Meet Ora, your AI interviewer" speed={4} color="#a2a8b8" shineColor="#ffffff" />
        </span>

        <RevealText
          as="h1"
          text="Rehearse the hire."
          stagger={110}
          className="text-5xl font-semibold tracking-tight text-fg sm:text-6xl lg:text-7xl"
        />

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3 text-lg text-muted sm:text-xl">
          <span>Practise your</span>
          <RotatingText
            texts={ROTATING}
            rotationInterval={2600}
            staggerDuration={0.012}
            splitBy="characters"
            mainClassName="glass overflow-hidden rounded-xl px-3 py-1 text-fg"
            elementLevelClassName="font-medium"
          />
          <span>out loud.</span>
        </div>

        <p className="mt-5 max-w-xl text-pretty leading-relaxed text-muted">
          Ora asks follow-up questions, listens while you answer, and scores every answer on substance,
          clarity and depth. You walk into the real room having already said it once.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Magnet padding={90} magnetStrength={6}>
            <ButtonLink href="/start" variant="primary" size="lg">
              Start a mock interview <ArrowRight className="size-4" />
            </ButtonLink>
          </Magnet>
          <ButtonLink href="/library" variant="glass" size="lg">
            Browse questions
          </ButtonLink>
        </div>

        <p className="mt-5 text-xs text-subtle">
          No sign-up needed · Voice or text · Works even when the API is offline
        </p>
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="rise-in relative">
      <GlassCard className="relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6">
          <OraAvatar persona="panelist" state="speaking" size={230} />

          <div className="w-full space-y-3">
            <div className="well rounded-2xl p-4">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-subtle">
                Question 2 of 5 · Technical
              </p>
              <p className="text-pretty text-sm leading-relaxed text-fg">
                “How does an index speed up reads, and what does it cost you on writes?”
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="mint">Substance 8</Chip>
              <Chip tone="sky">Clarity 7</Chip>
              <Chip tone="amber">Depth 6</Chip>
              <Chip>128 wpm</Chip>
            </div>

            <div className="glass rounded-2xl p-4">
              <p className="text-sm leading-relaxed text-muted">
                <span className="font-medium text-fg">Ora:</span> Solid answer, with room for more depth.
                Add one trade-off and a concrete example.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Marquee() {
  return (
    <section className="py-10">
      <LogoLoop
        logos={TOPICS.map(topic => ({
          node: <span className="chip px-4 py-1.5 text-xs text-muted">{topic}</span>,
          title: topic,
        }))}
        speed={40}
        gap={16}
        logoHeight={34}
        fadeOut
        fadeOutColor="#06070b"
        ariaLabel="Topics you can practise"
      />
    </section>
  );
}

const STEPS = [
  {
    icon: Layers,
    title: 'Pick your round',
    body: 'Technical, project deep-dive, HR, or a full loop that mixes all three. Paste a job description and questions follow its skills.',
  },
  {
    icon: Mic,
    title: 'Speak with Ora',
    body: 'Answer out loud while Ora listens. Ask for a hint, pass a question, or run a timer to feel real pressure.',
  },
  {
    icon: Gauge,
    title: 'Read your scorecard',
    body: 'Scores per answer, speaking pace, filler words, what a strong answer covers, and the two things to fix next.',
  },
];

function HowItWorks() {
  return (
    <section className="py-14">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps, about ten minutes"
        description="Short enough to do between lectures, close enough to the real thing to be useful."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <SpotlightCard
            key={step.title}
            className="glass rounded-3xl border-white/9 bg-transparent p-6"
            spotlightColor="rgba(111, 240, 198, 0.12)"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-mint">
                <step.icon className="size-5" />
              </span>
              <span className="font-mono text-xs text-subtle">0{index + 1}</span>
            </div>
            <h3 className="text-base font-semibold text-fg">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Follow-ups that adapt',
    body: 'Answer well and the next question gets harder. Struggle and Ora eases off, so you always practise at the edge of what you know.',
    span: 'md:col-span-2',
  },
  {
    icon: Gauge,
    title: 'Scored on three dimensions',
    body: 'Substance, clarity and depth — the same things a real panel listens for.',
  },
  {
    icon: Timer,
    title: 'Speaking analytics',
    body: 'Words per minute and filler words, measured from your own answers.',
  },
  {
    icon: Repeat,
    title: 'Retry drills',
    body: 'Send your weakest answers straight back into a short drill.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    body: 'No API key or network? A rule-based interviewer takes over in the browser.',
  },
];

function Features() {
  return (
    <section className="py-14">
      <SectionHeading
        eyebrow="What you get"
        title="Built to change how you answer, not just what you know"
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {FEATURES.map(feature => (
          <SpotlightCard
            key={feature.title}
            className={`glass rounded-3xl border-white/9 bg-transparent p-6 ${feature.span ?? ''}`}
            spotlightColor="rgba(161, 139, 255, 0.12)"
          >
            <feature.icon className="mb-4 size-5 text-iris" />
            <h3 className="text-base font-semibold text-fg">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
}

function Personas() {
  const entries = Object.entries(PERSONAS) as [Persona, (typeof PERSONAS)[Persona]][];
  return (
    <section className="py-14">
      <SectionHeading
        eyebrow="Choose your interviewer"
        title="From gentle warm-up to bar raiser"
        description="Same questions, very different rooms. Start kind, then turn up the pressure as the drive gets closer."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {entries.map(([key, persona]) => (
          <GlareHover
            key={key}
            width="100%"
            height="100%"
            background="transparent"
            borderColor="rgba(255,255,255,0.09)"
            borderRadius="1.5rem"
            glareColor="#ffffff"
            glareOpacity={0.14}
            glareAngle={-35}
            glareSize={280}
            transitionDuration={850}
            className="glass [display:block] rounded-3xl p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="size-9 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${persona.accent}, transparent 70%), radial-gradient(circle at 70% 70%, var(--color-iris), transparent 65%)`,
                  boxShadow: `0 0 18px -6px ${persona.accent}`,
                }}
              />
              <div>
                <h3 className="text-base font-semibold text-fg">{persona.label}</h3>
                <p className="text-xs text-subtle">{TRACKS.mixed.short} · {TRACKS.technical.short} · {TRACKS.hr.short}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{persona.blurb}</p>
            <p className="mt-4 font-display text-lg italic text-fg/90">{persona.sample}</p>
          </GlareHover>
        ))}
      </div>
    </section>
  );
}

function CommunityStrip() {
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    remote
      .insights()
      .then(setInsights)
      .catch(() => setInsights(null));
  }, []);

  if (!insights || insights.totals.interviews < 1) {
    return null;
  }

  const tiles = [
    { label: 'Interviews run', value: insights.totals.interviews },
    { label: 'Answers scored', value: insights.totals.answers },
    { label: 'Completion rate', value: insights.totals.completionRate, suffix: '%' },
    {
      label: 'Avg confidence gain',
      value: insights.averages.confidenceDelta ?? 0,
      prefix: (insights.averages.confidenceDelta ?? 0) > 0 ? '+' : '',
    },
  ];

  return (
    <section className="py-10">
      <GlassCard className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
        {tiles.map(tile => (
          <div key={tile.label}>
            <p className="font-mono text-2xl font-semibold tabular-nums text-fg">
              {tile.prefix}
              {tile.value}
              {tile.suffix}
            </p>
            <p className="mt-1 text-xs text-subtle">{tile.label}</p>
          </div>
        ))}
      </GlassCard>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-16">
      <GlassCard strong className="relative overflow-hidden p-8 text-center sm:p-12">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(111,240,198,0.22),transparent)]" />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          The first answer is always the worst.
          <br />
          <span className="font-display italic text-mint">Get it out of the way here.</span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Five questions, ten minutes, an honest scorecard. No account required.
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/start" variant="primary" size="lg">
            Start now <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="glass" size="lg">
            See your progress
          </ButtonLink>
        </div>
        <p className="relative mt-6 flex items-center justify-center gap-2 text-xs text-subtle">
          <ShieldCheck className="size-3.5" />
          Ora is an AI. Scores are practice signals, not hiring decisions.
        </p>
      </GlassCard>
    </section>
  );
}
