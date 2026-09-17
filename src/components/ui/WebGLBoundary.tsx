'use client';

import { Component, type ReactNode } from 'react';

/**
 * WebGL is optional decoration here. If a device cannot create a context (or the driver crashes), the
 * page keeps working with a plain gradient instead.
 */
export class WebGLBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
