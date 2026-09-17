'use client';

import dynamic from 'next/dynamic';
import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import CircularText from '@/components/reactbits/CircularText';
import { WebGLBoundary } from '@/components/ui/WebGLBoundary';
import { cn } from '@/lib/cn';
import { PERSONAS } from '@/lib/constants';
import type { Persona } from '@/lib/types';

const Orb = dynamic(() => import('@/components/reactbits/Orb'), { ssr: false });

export type OraState = 'idle' | 'speaking' | 'listening' | 'thinking';

const RING_TEXT: Record<OraState, string> = {
  idle: 'ORA · READY WHEN YOU ARE · ',
  speaking: 'ORA · SPEAKING · ORA · SPEAKING · ',
  listening: 'LISTENING · YOUR TURN · LISTENING · ',
  thinking: 'EVALUATING · ONE MOMENT · EVALUATING · ',
};

const SPIN: Record<OraState, number> = { idle: 34, speaking: 16, listening: 24, thinking: 7 };

/**
 * Ora, the AI interviewer. A WebGL orb tinted by persona that reacts to the candidate's voice while
 * listening, wrapped in a ring of status text.
 */
export function OraAvatar({
  persona,
  state = 'idle',
  size = 260,
  level,
  showRing = true,
  className,
}: {
  persona: Persona;
  state?: OraState;
  size?: number;
  level?: MotionValue<number>;
  showRing?: boolean;
  className?: string;
}) {
  const fallbackLevel = useMotionValue(0);
  const source = level ?? fallbackLevel;
  const glowScale = useTransform(source, [0, 1], [0.92, 1.18]);
  const glowOpacity = useTransform(source, [0, 1], [0.35, 0.9]);

  const { hue } = PERSONAS[persona];
  const active = state !== 'idle';

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <motion.div
        aria-hidden
        style={{ scale: glowScale, opacity: state === 'listening' ? glowOpacity : 0.4 }}
        className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(111,240,198,0.22),transparent_68%)] blur-md"
      />

      <WebGLBoundary
        fallback={
          <div className="absolute inset-[14%] animate-pulse rounded-full bg-gradient-to-br from-mint/50 via-iris/40 to-transparent blur-lg" />
        }
      >
        <div className="absolute inset-[13%]">
          <Orb hue={hue} hoverIntensity={0.4} rotateOnHover forceHoverState={active} backgroundColor="#06070b" />
        </div>
      </WebGLBoundary>

      {showRing && (
        <CircularText
          text={RING_TEXT[state]}
          spinDuration={SPIN[state]}
          onHover="speedUp"
          className={cn(
            'absolute inset-0 h-full w-full cursor-default font-medium tracking-[0.12em]',
            state === 'listening' ? 'text-mint/80' : state === 'thinking' ? 'text-amber/80' : 'text-muted/60',
          )}
          letterClassName="text-[0.58rem]"
        />
      )}
    </div>
  );
}
