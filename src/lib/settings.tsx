'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS, readJson, writeJson } from './storage';

export interface Settings {
  /** Ora reads questions and feedback aloud. */
  voiceEnabled: boolean;
  voiceURI: string | null;
  speechRate: number;
  /** Open the mic automatically once Ora finishes speaking. */
  autoListen: boolean;
  recognitionLang: string;
  /** Default answer timer in seconds; 0 is off. */
  timerSeconds: number;
  /** Interviews per week the candidate is aiming for (guests only; accounts store this server-side). */
  weeklyGoal: number;
}

const DEFAULTS: Settings = {
  voiceEnabled: true,
  voiceURI: null,
  speechRate: 1,
  autoListen: true,
  recognitionLang: 'en-IN',
  timerSeconds: 0,
  weeklyGoal: 3,
};

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    setSettings({ ...DEFAULTS, ...readJson<Partial<Settings>>(KEYS.settings, {}) });
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(current => {
      const next = { ...current, ...patch };
      writeJson(KEYS.settings, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    writeJson(KEYS.settings, DEFAULTS);
  }, []);

  const value = useMemo(() => ({ settings, update, reset, loaded }), [settings, update, reset, loaded]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return context;
}
