import type { Metadata } from 'next';
import { ScorecardView } from '@/components/scorecard/ScorecardView';

export const metadata: Metadata = {
  title: 'Scorecard',
  description: 'Rubric scores, speaking analytics and the transcript from your mock interview.',
};

export default async function ScorecardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScorecardView id={id} />;
}
