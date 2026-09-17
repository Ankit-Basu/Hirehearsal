'use client';

import { useEffect, useRef, useState } from 'react';

/** Counts down from `seconds` while `running`, calling `onExpire` once when it reaches zero. */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setRemaining(seconds);
    firedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running || seconds <= 0) {
      return;
    }
    const startedAt = Date.now();
    const initial = remaining > 0 ? remaining : seconds;

    const interval = setInterval(() => {
      const left = Math.max(0, initial - Math.round((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
    // `remaining` is intentionally excluded: the timer restarts only when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds]);

  return remaining;
}
