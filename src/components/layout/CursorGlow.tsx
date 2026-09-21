'use client';

import { useEffect, useRef } from 'react';

/** Diameter of the glow, in CSS pixels. */
const SIZE = 740;

/**
 * A soft light that follows the pointer across the frosted surfaces. The gradient is painted once and
 * only its transform changes, so following the cursor never repaints the page. Skipped entirely on
 * touch devices and for people who prefer reduced motion.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.style.display = 'none';
      return;
    }

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;

    const paint = () => {
      frame = 0;
      element.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      element.style.opacity = '1';
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      element.style.opacity = '0';
    };

    paint();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 opacity-0 transition-opacity duration-700 will-change-transform"
      style={{
        width: SIZE,
        height: SIZE,
        background:
          'radial-gradient(circle closest-side, rgba(111, 240, 198, 0.075), rgba(161, 139, 255, 0.04) 56%, transparent)',
      }}
    />
  );
}
