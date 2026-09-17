import type { Metadata } from 'next';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata: Metadata = {
  title: 'Question library',
  description: 'Every question in the Hirehearsal bank, grouped by round and difficulty.',
};

export default function LibraryPage() {
  return <LibraryView />;
}
