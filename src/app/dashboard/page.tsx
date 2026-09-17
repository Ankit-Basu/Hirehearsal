import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const metadata: Metadata = {
  title: 'Progress',
  description: 'Interview readiness, streaks, rubric averages and your recent scorecards.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
