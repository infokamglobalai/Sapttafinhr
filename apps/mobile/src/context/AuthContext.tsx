import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login, verifyMfa, type LoginResult } from '../api/auth';
import { mobileFetch } from '../api/client';
import type { MeResponse } from '../api/types';

const TOKEN_KEY = 'saptta_api_token';
const WORKSPACE_KEY = 'saptta_workspace';

interface AuthState {
  token: string | null;
  workspace: string | null;
  user: MeResponse | null;
  loading: boolean;
  signIn: (workspace: string, email: string, password: string) => Promise<LoginResult>;
  completeMfa: (challengeToken: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback(async (apiToken: string, ws: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, apiToken);
    await SecureStore.setItemAsync(WORKSPACE_KEY, ws);
    setToken(apiToken);
    setWorkspace(ws);
    const me = await mobileFetch<MeResponse>('/me/', apiToken);
    setUser(me);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await mobileFetch<MeResponse>('/me/', token);
    setUser(me);
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedWs = await SecureStore.getItemAsync(WORKSPACE_KEY);
        if (storedToken && storedWs) {
          setToken(storedToken);
          setWorkspace(storedWs);
          const me = await mobileFetch<MeResponse>('/me/', storedToken);
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(WORKSPACE_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (ws: string, email: string, password: string) => login(ws, email, password),
    [],
  );

  const completeMfa = useCallback(
    async (challengeToken: string, code: string) => {
      const result = await verifyMfa(challengeToken, code);
      if (result.kind !== 'token') throw new Error('MFA did not return a token.');
      await persistSession(result.api_token, result.workspace);
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(WORKSPACE_KEY);
    setToken(null);
    setWorkspace(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      workspace,
      user,
      loading,
      signIn: async (ws: string, email: string, password: string) => {
        const result = await signIn(ws, email, password);
        if (result.kind === 'token') {
          await persistSession(result.api_token, result.workspace);
        }
        return result;
      },
      completeMfa,
      signOut,
      refreshUser,
    }),
    [token, workspace, user, loading, signIn, completeMfa, signOut, refreshUser, persistSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
