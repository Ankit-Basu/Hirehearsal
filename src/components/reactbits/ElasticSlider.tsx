'use client';

// ElasticSlider from React Bits (https://reactbits.dev), TS + Tailwind variant.
// Copyright (c) 2026 David Haz. MIT + Commons Clause, see ./LICENSE.md.
// Adapted for Hirehearsal: controlled value with onChange, keyboard + ARIA slider semantics,
// themed track colors, and the floating value label removed (the parent renders the value).

import React, { useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';

const MAX_OVERFLOW = 50;

interface ElasticSliderProps {
  value: number;
  onChange: (value: number) => void;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ariaLabel?: string;
  ariaValueText?: (value: number) => string;
}

const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  onChange,
  startingValue = 0,
  maxValue = 100,
  className = '',
  isStepped = false,
  stepSize = 1,
  leftIcon = <>-</>,
  rightIcon = <>+</>,
  ariaLabel,
  ariaValueText
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 w-48 ${className}`}>
      <Slider
        value={value}
        onChange={onChange}
        startingValue={startingValue}
        maxValue={maxValue}
        isStepped={isStepped}
        stepSize={stepSize}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        ariaLabel={ariaLabel}
        ariaValueText={ariaValueText}
      />
    </div>
  );
};

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  startingValue: number;
  maxValue: number;
  isStepped: boolean;
  stepSize: number;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  ariaLabel?: string;
  ariaValueText?: (value: number) => string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  leftIcon,
  rightIcon,
  ariaLabel,
  ariaValueText
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<'left' | 'middle' | 'right'>('middle');
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  const commit = (raw: number) => {
    let next = raw;
    if (isStepped) {
      next = Math.round(next / stepSize) * stepSize;
    }
    next = Math.min(Math.max(next, startingValue), maxValue);
    if (next !== value) onChange(next);
  };

  useMotionValueEvent(clientX, 'change', (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newValue: number;
      if (latest < left) {
        setRegion('left');
        newValue = left - latest;
      } else if (latest > right) {
        setRegion('right');
        newValue = latest - right;
      } else {
        setRegion('middle');
        newValue = 0;
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      commit(startingValue + ((e.clientX - left) / width) * (maxValue - startingValue));
      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: 'spring', bounce: 0.5 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = isStepped ? stepSize : (maxValue - startingValue) / 20;
    const actions: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      Home: startingValue,
      End: maxValue
    };
    if (e.key in actions) {
      e.preventDefault();
      commit(actions[e.key]);
    }
  };

  const getRangePercentage = (): number => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((value - startingValue) / totalRange) * 100;
  };

  return (
    <motion.div
      onHoverStart={() => animate(scale, 1.2)}
      onHoverEnd={() => animate(scale, 1)}
      onTouchStart={() => animate(scale, 1.2)}
      onTouchEnd={() => animate(scale, 1)}
      style={{
        scale,
        opacity: useTransform(scale, [1, 1.2], [0.8, 1])
      }}
      className="flex w-full touch-none select-none items-center justify-center gap-4"
    >
      <motion.div
        animate={{
          scale: region === 'left' ? [1, 1.4, 1] : 1,
          transition: { duration: 0.25 }
        }}
        style={{
          x: useTransform(() => (region === 'left' ? -overflow.get() / scale.get() : 0))
        }}
      >
        {leftIcon}
      </motion.div>

      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={startingValue}
        aria-valuemax={maxValue}
        aria-valuenow={Math.round(value)}
        aria-valuetext={ariaValueText ? ariaValueText(value) : undefined}
        onKeyDown={handleKeyDown}
        className="relative flex w-full max-w-xs flex-grow cursor-grab touch-none select-none items-center rounded-full py-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mint)]/70"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      >
        <motion.div
          style={{
            scaleX: useTransform(() => {
              if (sliderRef.current) {
                const { width } = sliderRef.current.getBoundingClientRect();
                return 1 + overflow.get() / width;
              }
              return 1;
            }),
            scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]),
            transformOrigin: useTransform(() => {
              if (sliderRef.current) {
                const { left, width } = sliderRef.current.getBoundingClientRect();
                return clientX.get() < left + width / 2 ? 'right' : 'left';
              }
              return 'center';
            }),
            height: useTransform(scale, [1, 1.2], [8, 14]),
            marginTop: useTransform(scale, [1, 1.2], [0, -3]),
            marginBottom: useTransform(scale, [1, 1.2], [0, -3])
          }}
          className="flex flex-grow"
        >
          <div className="relative h-full flex-grow overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-[var(--color-mint)] to-[var(--color-iris)]"
              style={{ width: `${getRangePercentage()}%` }}
            />
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{
          scale: region === 'right' ? [1, 1.4, 1] : 1,
          transition: { duration: 0.25 }
        }}
        style={{
          x: useTransform(() => (region === 'right' ? overflow.get() / scale.get() : 0))
        }}
      >
        {rightIcon}
      </motion.div>
    </motion.div>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default ElasticSlider;
