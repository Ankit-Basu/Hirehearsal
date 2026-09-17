'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, BookOpen, Home, Mic, SlidersHorizontal } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { useEngine } from '@/lib/engine-status';
import { initialsOf } from '@/lib/format';
import { Logo } from './Logo';

const LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/start', label: 'Practise', icon: Mic },
  { href: '/library', label: 'Questions', icon: BookOpen },
  { href: '/dashboard', label: 'Progress', icon: BarChart3 },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Shows whether interviews are scored by the AI model, the API's offline coach, or this browser. */
export function EngineBadge({ withLabel = true }: { withLabel?: boolean }) {
  const { state, mode, status } = useEngine();

  const tone =
    state === 'checking' ? 'bg-subtle' : mode === 'llm' ? 'bg-mint' : state === 'api' ? 'bg-amber' : 'bg-sky';
  const label =
    state === 'checking' ? 'Checking' : mode === 'llm' ? 'AI live' : state === 'api' ? 'Rule-based' : 'Offline';
  const title =
    state === 'checking'
      ? 'Checking the interview API…'
      : mode === 'llm'
        ? `Answers scored by ${status?.model ?? 'the configured model'}`
        : state === 'api'
          ? 'API online without an AI key: answers are scored by the rule-based coach'
          : 'API unreachable: interviews run in this browser';

  return (
    <span className="chip gap-1.5 px-2.5 py-1" title={title}>
      <span className={cn('size-1.5 rounded-full', tone, state !== 'checking' && 'animate-pulse')} />
      {withLabel && <span className="hidden text-[0.7rem] sm:inline">{label}</span>}
    </span>
  );
}

export function Navbar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const pathname = usePathname() ?? '/';
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="no-print fixed inset-x-0 top-3 z-50 px-3">
      <div className="mx-auto max-w-5xl">
        <div
          className={cn(
            'glass-strong flex h-[58px] w-full items-center justify-between gap-2 rounded-full px-2.5 transition-colors duration-300 sm:px-3',
            scrolled && 'bg-[#0b0d14]/92 shadow-[0_18px_40px_-24px_rgba(0,0,0,1)]',
          )}
        >
          <Link href="/" className="rounded-full px-1 py-1" aria-label="Hirehearsal home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map(link => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      className="absolute inset-0 rounded-full border border-white/10 bg-white/8"
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <EngineBadge />
            <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} aria-label="Open settings">
              <SlidersHorizontal className="size-4" />
            </Button>
            {user ? (
              <Link
                href="/dashboard"
                aria-label={`Signed in as ${user.name}`}
                title={user.name}
                className="grid size-8 place-items-center rounded-full border border-mint/40 bg-mint/15 text-xs font-semibold text-mint"
              >
                {initialsOf(user.name)}
              </Link>
            ) : (
              <ButtonLink href="/login" size="sm" variant="glass" className="hidden sm:inline-flex">
                Sign in
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/** App-style bottom navigation on phones. */
export function MobileTabBar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-white/8 bg-canvas/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      <div className="flex items-stretch justify-around">
        {LINKS.map(link => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[0.65rem] font-medium transition-colors',
                active ? 'text-mint' : 'text-subtle',
              )}
            >
              <Icon className="size-5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
