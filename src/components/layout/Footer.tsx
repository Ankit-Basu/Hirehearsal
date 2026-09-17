import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-white/6 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Practise interviews out loud with Ora, an AI interviewer, and walk into the real room having
            already answered the hard questions once.
          </p>
        </div>

        <div className="flex gap-10">
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Practise</p>
            <Link href="/start" className="block text-muted transition hover:text-fg">
              New interview
            </Link>
            <Link href="/library" className="block text-muted transition hover:text-fg">
              Question library
            </Link>
            <Link href="/dashboard" className="block text-muted transition hover:text-fg">
              Your progress
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Built with</p>
            <p className="text-muted">Spring Boot 4</p>
            <p className="text-muted">Next.js 16</p>
            <a
              href="https://reactbits.dev"
              target="_blank"
              rel="noreferrer noopener"
              className="block text-muted transition hover:text-fg"
            >
              React Bits
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-2 border-t border-white/6 pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>Ora is an AI interviewer. Scores are practice signals, not hiring decisions.</p>
        <p>© {new Date().getFullYear()} Hirehearsal</p>
      </div>
    </footer>
  );
}
