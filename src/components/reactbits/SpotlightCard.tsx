'use client';

// SpotlightCard from React Bits (https://reactbits.dev), TS + Tailwind variant.
// Copyright (c) 2026 David Haz. MIT + Commons Clause, see ./LICENSE.md.
// Adapted for Hirehearsal: forwards native div props (role, tabIndex, aria-*, handlers) and merges
// class names so the default surface can be restyled as a glass card.

import React, { useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface Position {
  x: number;
  y: number;
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  spotlightColor?: `rgba(${number}, ${number}, ${number}, ${number})`;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(255, 255, 255, 0.25)',
  onMouseMove,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = e => {
    onMouseMove?.(e);
    if (!divRef.current || isFocused) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus: React.FocusEventHandler<HTMLDivElement> = e => {
    onFocus?.(e);
    setIsFocused(true);
    setOpacity(0.6);
  };

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = e => {
    onBlur?.(e);
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter: React.MouseEventHandler<HTMLDivElement> = e => {
    onMouseEnter?.(e);
    setOpacity(0.6);
  };

  const handleMouseLeave: React.MouseEventHandler<HTMLDivElement> = e => {
    onMouseLeave?.(e);
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn('relative rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden p-8', className)}
      {...rest}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
