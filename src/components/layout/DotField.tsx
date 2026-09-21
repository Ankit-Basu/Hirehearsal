'use client';

import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;
const MINT = [111, 240, 198] as const;
const IRIS = [161, 139, 255] as const;
const REST_ALPHA = 0.2;
/** Fraction of the remaining distance a dot covers per 60Hz frame: fluid, never springy. */
const EASE = 0.14;
const FRAME_MS = 1000 / 60;

type DotFieldProps = {
  /** Distance between dots, in CSS pixels. */
  gap?: number;
  /** Dot radius at rest. */
  size?: number;
  /** How far from the cursor dots feel it. The cleared circle is half of this. */
  reach?: number;
};

/**
 * A quiet grid of dots behind the page that parts around the cursor and settles back when it leaves.
 * Only the patch around moving dots is repainted, and the loop stops once they settle, so a still
 * page costs nothing. Touch screens and reduced-motion users get the same grid without the motion.
 */
export function DotField({ gap = 26, size = 1.1, reach = 140 }: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const interactive =
      window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hole = reach / 2;
    // Largest radius a dot is ever drawn at, plus a pixel for antialiasing.
    const pad = size * 1.6 + 1;

    let ratio = 1;
    let width = 0;
    let height = 0;
    let home = new Float32Array(0); // resting x, y pairs
    let shift = new Float32Array(0); // current displacement x, y pairs
    let pointerX = 0;
    let pointerY = 0;
    let pointerIn = false;
    let frame = 0;
    let lastTime = 0;

    const layout = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const cols = Math.floor(width / gap) + 2;
      const rows = Math.floor(height / gap) + 2;
      const left = (width - (cols - 1) * gap) / 2;
      const top = (height - (rows - 1) * gap) / 2;
      home = new Float32Array(cols * rows * 2);
      shift = new Float32Array(cols * rows * 2);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = (row * cols + col) * 2;
          home[index] = left + col * gap;
          home[index + 1] = top + row * gap;
        }
      }
    };

    /** Clears one rectangle and repaints every dot overlapping it, clipped so edge dots never double up. */
    const paint = (left: number, top: number, right: number, bottom: number) => {
      // Snap to device pixels so the clear and the clip have hard edges at any zoom level.
      left = Math.floor(left * ratio) / ratio;
      top = Math.floor(top * ratio) / ratio;
      right = Math.ceil(right * ratio) / ratio;
      bottom = Math.ceil(bottom * ratio) / ratio;

      context.save();
      context.beginPath();
      context.rect(left, top, right - left, bottom - top);
      context.clip();
      context.clearRect(left, top, right - left, bottom - top);

      // Resting dots share one path and one fill.
      const displaced: number[] = [];
      context.beginPath();
      for (let index = 0; index < home.length; index += 2) {
        const x = home[index] + shift[index];
        const y = home[index + 1] + shift[index + 1];
        if (x < left - pad || x > right + pad || y < top - pad || y > bottom + pad) continue;
        if (Math.abs(shift[index]) + Math.abs(shift[index + 1]) > 0.6) {
          displaced.push(index);
        } else {
          context.moveTo(x + size, y);
          context.arc(x, y, size, 0, TAU);
        }
      }
      context.fillStyle = `rgba(255, 255, 255, ${REST_ALPHA})`;
      context.fill();

      // Dots that were pushed aside catch the light: brighter, a touch larger, and tinted from
      // mint on the cursor's left to iris on its right, like the brand gradient.
      for (const index of displaced) {
        const sx = shift[index];
        const sy = shift[index + 1];
        const amount = Math.hypot(sx, sy);
        const strength = Math.min(1, amount / hole);
        const across = (sx / amount + 1) / 2;
        const channel = (channelIndex: 0 | 1 | 2) => {
          const tint = MINT[channelIndex] + (IRIS[channelIndex] - MINT[channelIndex]) * across;
          return Math.round(255 + (tint - 255) * strength);
        };
        context.fillStyle = `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${REST_ALPHA + strength * 0.55})`;
        context.beginPath();
        context.arc(home[index] + sx, home[index + 1] + sy, size * (1 + strength * 0.6), 0, TAU);
        context.fill();
      }

      context.restore();
    };

    /** Moves every dot toward where the cursor wants it and repaints just the area that changed. */
    const step = (time: number) => {
      frame = 0;
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : FRAME_MS;
      lastTime = time;
      const ease = 1 - Math.pow(1 - EASE, elapsed / FRAME_MS);

      let settling = false;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let index = 0; index < home.length; index += 2) {
        const hx = home[index];
        const hy = home[index + 1];
        let targetX = 0;
        let targetY = 0;
        if (pointerIn) {
          const dx = hx - pointerX;
          const dy = hy - pointerY;
          if (dx > -reach && dx < reach && dy > -reach && dy < reach) {
            const distance = Math.hypot(dx, dy);
            if (distance < reach && distance > 0.01) {
              // Pushes a dot at distance r out to r + (reach - r)² / (2 * reach): the centre clears
              // to a circle of radius reach / 2, and rows bend around it without crossing.
              const falloff = 1 - distance / reach;
              const push = falloff * falloff * hole;
              targetX = (dx / distance) * push;
              targetY = (dy / distance) * push;
            }
          }
        }

        const fromX = shift[index];
        const fromY = shift[index + 1];
        let toX = fromX + (targetX - fromX) * ease;
        let toY = fromY + (targetY - fromY) * ease;
        if (Math.abs(targetX - toX) > 0.05 || Math.abs(targetY - toY) > 0.05) {
          settling = true;
        } else {
          // Land exactly, so the loop can stop.
          toX = targetX;
          toY = targetY;
        }
        if (toX === fromX && toY === fromY) continue;

        shift[index] = toX;
        shift[index + 1] = toY;
        // Both where the dot was and where it is now need repainting.
        minX = Math.min(minX, hx + fromX, hx + toX);
        maxX = Math.max(maxX, hx + fromX, hx + toX);
        minY = Math.min(minY, hy + fromY, hy + toY);
        maxY = Math.max(maxY, hy + fromY, hy + toY);
      }

      if (minX <= maxX) paint(minX - pad, minY - pad, maxX + pad, maxY + pad);
      if (settling) {
        frame = requestAnimationFrame(step);
      } else {
        lastTime = 0;
      }
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      layout();
      paint(0, 0, width, height);
      if (pointerIn) wake();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerIn = true;
      wake();
    };
    const onLeave = () => {
      pointerIn = false;
      wake();
    };

    redraw();
    window.addEventListener('resize', redraw);
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('blur', onLeave);
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', redraw);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [gap, size, reach]);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />;
}
