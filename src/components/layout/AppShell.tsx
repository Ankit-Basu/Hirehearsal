'use client';

import { MotionConfig } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/auth';
import { EngineProvider } from '@/lib/engine-status';
import { SettingsProvider } from '@/lib/settings';
import { cn } from '@/lib/cn';
import { Background } from './Background';
import { CursorGlow } from './CursorGlow';
import { Footer } from './Footer';
import { MobileTabBar, Navbar } from './Navbar';
import { SettingsSheet } from './SettingsSheet';

function Chrome({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const inRoom = pathname.startsWith('/room');

  return (
    <>
      <Background />
      {!inRoom && <CursorGlow />}
      <Navbar onOpenSettings={() => setSettingsOpen(true)} />
      <main className={cn('relative z-10 px-4 pt-24', inRoom ? 'pb-8' : 'pb-24 sm:pb-8')}>{children}</main>
      {!inRoom && <Footer />}
      {!inRoom && <MobileTabBar />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SettingsProvider>
        <EngineProvider>
          <AuthProvider>
            <ToastProvider>
              <Chrome>{children}</Chrome>
            </ToastProvider>
          </AuthProvider>
        </EngineProvider>
      </SettingsProvider>
    </MotionConfig>
  );
}
