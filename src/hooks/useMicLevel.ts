'use client';

import { useEffect, useState } from 'react';
import { useMotionValue, type MotionValue } from 'motion/react';

/**
 * Live microphone loudness (0-1) as a motion value, so the avatar can react to the candidate's voice
 * without re-rendering the interview room sixty times a second.
 */
export function useMicLevel(active: boolean): { level: MotionValue<number>; denied: boolean } {
  const level = useMotionValue(0);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      level.set(0);
      return;
    }

    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let frame = 0;
    let cancelled = false;

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        if (!cancelled) setDenied(true);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      context = new AudioContextCtor();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const samples = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / samples.length);
        const next = Math.min(1, rms * 4.5);
        // Rise quickly, fall gently, so the avatar pulses instead of flickering.
        level.set(next > level.get() ? next : level.get() * 0.88 + next * 0.12);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      void context?.close();
      level.set(0);
    };
  }, [active, level]);

  return { level, denied };
}
