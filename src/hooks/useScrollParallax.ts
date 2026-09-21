'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-linked motion with GSAP ScrollTrigger (`scrub`), so the element moves in lockstep with the
 * scrollbar. It starts from the element's natural position, so nothing is hidden if it never runs.
 */
export function useScrollParallax(
  ref: RefObject<HTMLElement | null>,
  { y = -80, opacity, scale }: { y?: number; opacity?: number; scale?: number } = {},
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const tween = gsap.to(element, {
      y,
      ...(opacity === undefined ? {} : { opacity }),
      ...(scale === undefined ? {} : { scale }),
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top top+=120',
        end: 'bottom top',
        scrub: 0.6,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ref, y, opacity, scale]);
}
