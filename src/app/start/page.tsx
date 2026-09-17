import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SetupWizard } from '@/components/setup/SetupWizard';

export const metadata: Metadata = {
  title: 'New interview',
  description: 'Choose a round, an interviewer and how many questions, then step into the room.',
};

export default function StartPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-muted">Loading your setup…</div>}>
      <SetupWizard />
    </Suspense>
  );
}
