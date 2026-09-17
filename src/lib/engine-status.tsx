'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { remote } from './api/remote';
import type { ApiStatus } from './types';

/**
 * Is the Spring Boot API reachable, and is an AI model configured? Everything downstream uses this to
 * decide between the API and the browser's offline interviewer.
 */
export type EngineState = 'checking' | 'api' | 'offline';

interface EngineContextValue {
  state: EngineState;
  status: ApiStatus | null;
  online: boolean;
  /** 'llm' when a model is configured, 'offline' for rule-based scoring. */
  mode: 'llm' | 'offline';
  refresh: () => Promise<void>;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngineState>('checking');
  const [status, setStatus] = useState<ApiStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await remote.status();
      setStatus(next);
      setState('api');
    } catch {
      setStatus(null);
      setState('offline');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<EngineContextValue>(
    () => ({
      state,
      status,
      online: state === 'api',
      mode: state === 'api' && status?.engine === 'llm' ? 'llm' : 'offline',
      refresh,
    }),
    [state, status, refresh],
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used inside EngineProvider');
  }
  return context;
}
