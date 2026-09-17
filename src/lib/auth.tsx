'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from './api/client';
import { remote } from './api/remote';
import { claimableIds } from './history';
import { KEYS, readJson, removeKey, writeJson, writeString, readString } from './storage';
import type { UserView } from './types';

interface AuthContextValue {
  user: UserView | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserView>;
  signUp: (name: string, email: string, password: string) => Promise<UserView>;
  signOut: () => void;
  updateProfile: (patch: { name?: string; targetRole?: string | null; weeklyGoal?: number }) => Promise<void>;
  /** Number of guest interviews attached to the account at the last sign-in. */
  claimed: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(0);

  useEffect(() => {
    const saved = readString(KEYS.token);
    if (!saved) {
      setLoading(false);
      return;
    }
    // Show the cached profile immediately, then confirm the token is still valid.
    setToken(saved);
    setUser(readJson<UserView | null>(KEYS.user, null));

    remote
      .me(saved)
      .then(profile => {
        setUser(profile);
        writeJson(KEYS.user, profile);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          removeKey(KEYS.token);
          removeKey(KEYS.user);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const adopt = useCallback(async (nextToken: string, profile: UserView) => {
    setToken(nextToken);
    setUser(profile);
    writeString(KEYS.token, nextToken);
    writeJson(KEYS.user, profile);

    // Interviews taken before signing in become part of the account's history.
    const ids = claimableIds();
    if (ids.length > 0) {
      try {
        const result = await remote.claim(ids, nextToken);
        setClaimed(result.claimed);
      } catch {
        setClaimed(0);
      }
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await remote.login({ email, password });
      await adopt(response.token, response.user);
      return response.user;
    },
    [adopt],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await remote.register({ email, password, name });
      await adopt(response.token, response.user);
      return response.user;
    },
    [adopt],
  );

  const signOut = useCallback(() => {
    removeKey(KEYS.token);
    removeKey(KEYS.user);
    setToken(null);
    setUser(null);
    setClaimed(0);
  }, []);

  const updateProfile = useCallback(
    async (patch: { name?: string; targetRole?: string | null; weeklyGoal?: number }) => {
      if (!token) return;
      const profile = await remote.updateProfile(patch, token);
      setUser(profile);
      writeJson(KEYS.user, profile);
    },
    [token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signUp, signOut, updateProfile, claimed }),
    [user, token, loading, signIn, signUp, signOut, updateProfile, claimed],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
