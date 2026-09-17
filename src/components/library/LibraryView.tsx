'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Chip, Segmented } from '@/components/ui/Controls';
import { TextField } from '@/components/ui/Field';
import { GlassCard, SectionHeading } from '@/components/ui/Surface';
import { TIER_LABELS } from '@/lib/constants';
import { bank } from '@/lib/engine/bank';
import { fill } from '@/lib/engine/text';
import type { Tier } from '@/lib/types';

type Tab = 'technical' | 'project' | 'hr';

const TIERS: Tier[] = ['foundation', 'core', 'stretch'];

const PLACEHOLDERS = { topic: 'this topic', project: 'your project', role: 'software engineer' };

export function LibraryView() {
  const [tab, setTab] = useState<Tab>('technical');
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const matches = (text: string) => needle.length === 0 || text.toLowerCase().includes(needle);

  const topics = useMemo(
    () =>
      bank.technical.topics
        .map(topic => ({
          ...topic,
          questions: TIERS.flatMap(tier =>
            topic.questions[tier].filter(matches).map(question => ({ tier, question })),
          ),
        }))
        .filter(topic => topic.questions.length > 0 || matches(topic.label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needle],
  );

  const flatSet = (key: 'project' | 'hr') =>
    TIERS.flatMap(tier =>
      bank[key][tier]
        .map(question => fill(question, PLACEHOLDERS))
        .filter(matches)
        .map(question => ({ tier, question })),
    );

  const total =
    bank.technical.topics.reduce(
      (sum, topic) => sum + TIERS.reduce((count, tier) => count + topic.questions[tier].length, 0),
      0,
    ) +
    TIERS.reduce((count, tier) => count + bank.technical.generic[tier].length, 0) +
    TIERS.reduce((count, tier) => count + bank.project[tier].length + bank.hr[tier].length, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading
        eyebrow="Question library"
        title={`${total} questions Ora can ask`}
        description="The offline question bank, grouped by round and difficulty. Pick a topic to practise it out loud."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          className="sm:w-auto"
          ariaLabel="Question round"
          options={[
            { value: 'technical', label: 'Technical' },
            { value: 'project', label: 'Project' },
            { value: 'hr', label: 'HR' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <TextField
            placeholder="Search questions…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="pl-9"
            aria-label="Search questions"
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {tab === 'technical' &&
          topics.map(topic => (
            <GlassCard key={topic.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-fg">{topic.label}</h2>
                  <p className="mt-1 text-xs text-subtle">
                    {topic.questions.length} question{topic.questions.length === 1 ? '' : 's'}
                  </p>
                </div>
                <ButtonLink
                  href={`/start?track=technical&topic=${encodeURIComponent(topic.label)}`}
                  variant="glass"
                  size="sm"
                >
                  Practise this <ArrowRight className="size-3.5" />
                </ButtonLink>
              </div>
              <ul className="mt-4 space-y-2">
                {topic.questions.map(entry => (
                  <li key={entry.question} className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                    <Chip tone={entry.tier === 'stretch' ? 'rose' : entry.tier === 'core' ? 'sky' : 'mint'}>
                      {TIER_LABELS[entry.tier]}
                    </Chip>
                    <span className="min-w-0 flex-1">{entry.question}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}

        {tab !== 'technical' && (
          <GlassCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-fg">
                {tab === 'project' ? 'Project deep-dive' : 'HR & behavioural'}
              </h2>
              <ButtonLink href={`/start?track=${tab}`} variant="glass" size="sm">
                Practise this round <ArrowRight className="size-3.5" />
              </ButtonLink>
            </div>
            <ul className="mt-4 space-y-2">
              {flatSet(tab).map(entry => (
                <li key={entry.question} className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                  <Chip tone={entry.tier === 'stretch' ? 'rose' : entry.tier === 'core' ? 'sky' : 'mint'}>
                    {TIER_LABELS[entry.tier]}
                  </Chip>
                  <span className="min-w-0 flex-1">{entry.question}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {tab === 'technical' && topics.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No questions match “{query}”.</p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-subtle">
        With an AI key configured, Ora writes follow-up questions from your actual answers. This bank is the
        fallback and keeps the app working offline.
      </p>
    </div>
  );
}
