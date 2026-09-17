import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Hirehearsal — AI mock interviews',
    template: '%s · Hirehearsal',
  },
  description:
    'Rehearse technical, project and HR interviews out loud with Ora, an AI interviewer that scores substance, clarity and depth, then hands you a scorecard.',
  applicationName: 'Hirehearsal',
  keywords: ['mock interview', 'AI interview practice', 'placement preparation', 'technical interview', 'HR round'],
  openGraph: {
    title: 'Hirehearsal — AI mock interviews',
    description: 'Rehearse the hire. Practise interviews out loud and get scored like it counts.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#06070b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body className="grain">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
