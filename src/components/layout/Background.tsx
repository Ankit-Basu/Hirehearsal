'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { WebGLBoundary } from '@/components/ui/WebGLBoundary';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { DotField } from './DotField';

const SoftAurora = dynamic(() => import('@/components/reactbits/SoftAurora'), { ssr: false });

/**
 * Slow aurora light and a cursor-reactive dot grid behind the frosted panels. Both stay out of the
 * interview room to reduce distraction.
 */
export function Background() {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const dim = pathname?.startsWith('/room') ?? false;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_12%_-10%,rgba(111,240,198,0.10),transparent_60%),radial-gradient(80%_55%_at_88%_0%,rgba(161,139,255,0.12),transparent_62%)]" />
      {/* The interview room already runs the avatar's WebGL context, so the aurora stays still there. */}
      {!reducedMotion && !dim && (
        <WebGLBoundary>
          <div className={cn('absolute inset-0 transition-opacity duration-1000', 'opacity-70')}>
            <SoftAurora
              color1="#6ff0c6"
              color2="#a18bff"
              speed={0.42}
              scale={1.7}
              brightness={0.9}
              bandHeight={0.46}
              bandSpread={1.1}
              layerOffset={0.35}
              enableMouseInteraction={false}
              resolutionScale={0.6}
              maxFps={30}
            />
          </div>
        </WebGLBoundary>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_0%,transparent_25%,var(--color-canvas)_88%)]" />
      {/* Drawn above the vignette so the grid reads evenly across the screen. */}
      {!dim && <DotField />}
    </div>
  );
}
