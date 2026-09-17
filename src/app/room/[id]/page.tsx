import type { Metadata } from 'next';
import { InterviewRoom } from '@/components/interview/InterviewRoom';

export const metadata: Metadata = {
  title: 'Interview room',
  robots: { index: false },
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewRoom id={id} />;
}
