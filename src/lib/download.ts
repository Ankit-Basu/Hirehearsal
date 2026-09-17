import { ROUND_LABELS } from './constants';
import { formatDateTime } from './format';
import type { Scorecard } from './types';

/** Turns a scorecard into a Markdown study sheet the candidate can keep. */
export function scorecardToMarkdown(card: Scorecard): string {
  const lines: string[] = [];
  lines.push(`# ${card.headline}`);
  lines.push('');
  lines.push(`_${formatDateTime(card.createdAt)} · Hirehearsal mock interview_`);
  lines.push('');
  lines.push(
    `**Overall:** ${card.overallScore ?? '—'}/10 (${card.band}) · **Answered:** ${card.answeredCount}/${card.questionCount}`,
  );
  if (card.confidenceDelta != null) {
    lines.push(
      `**Confidence:** ${card.preConfidence} → ${card.postConfidence} (${card.confidenceDelta >= 0 ? '+' : ''}${card.confidenceDelta})`,
    );
  }
  if (card.rubric) {
    lines.push(
      `**Rubric:** substance ${card.rubric.substance ?? '—'} · clarity ${card.rubric.clarity ?? '—'} · depth ${card.rubric.depth ?? '—'}`,
    );
  }
  if (card.speech.avgWpm) {
    lines.push(
      `**Speaking:** ${card.speech.avgWpm} wpm · ${card.speech.fillerCount} filler words · ${card.speech.totalWords} words`,
    );
  }

  lines.push('', '## What went well');
  card.highlights.forEach(item => lines.push(`- ${item}`));
  lines.push('', '## What to work on');
  card.focusAreas.forEach(item => lines.push(`- ${item}`));

  lines.push('', '## Transcript');
  for (const turn of card.turns) {
    lines.push('', `### Q${turn.index} · ${ROUND_LABELS[turn.round]}${turn.skipped ? ' · passed' : ''}`);
    lines.push('', `**${turn.question}**`);
    if (turn.hint) {
      lines.push('', `> Hint used: ${turn.hint}`);
    }
    lines.push('', turn.answered ? turn.answer || '_(passed)_' : '_(not answered)_');
    if (turn.score != null) {
      lines.push('', `**Score:** ${turn.score}/10${turn.rubric ? ` (substance ${turn.rubric.substance}, clarity ${turn.rubric.clarity}, depth ${turn.rubric.depth})` : ''}`);
    }
    if (turn.feedback) lines.push('', `**Ora:** ${turn.feedback}`);
    if (turn.tip) lines.push('', `**Tip:** ${turn.tip}`);
    if (turn.outline.length > 0) {
      lines.push('', '**A strong answer covers:**');
      turn.outline.forEach(item => lines.push(`- ${item}`));
    }
  }

  if (card.reflection) {
    lines.push('', '## My reflection', '', card.reflection);
  }
  lines.push('', '---', '', 'Scores come from an AI practice interviewer and are guidance, not a hiring decision.');
  return lines.join('\n');
}

export function downloadText(filename: string, content: string, type = 'text/markdown;charset=utf-8'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'interview'
  );
}
