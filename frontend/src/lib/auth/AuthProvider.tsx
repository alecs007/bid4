"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSWRConfig } from "swr";

import * as authApi from "@/lib/api/auth";
import { clearPages } from "@/lib/hooks/cursorCache";
import { rememberSession } from "./session-hint";
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
  UserRole,
} from "@/lib/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  switchAccount: (userId: string) => Promise<User>;
  refresh: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const { mutate } = useSWRConfig();

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const restored = await authApi.restore().catch(() => null);
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? "authenticated" : "anonymous");
      rememberSession(Boolean(restored));
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = useCallback((session: AuthSession) => {
    setUser(session.user);
    setStatus("authenticated");
    rememberSession(true);
    return session.user;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => adopt(await authApi.login(payload)),
    [adopt],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => authApi.register(payload),
    [],
  );

  const switchAccount = useCallback(
    async (userId: string) => adopt(await authApi.loginAsSeedAccount(userId)),
    [adopt],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("anonymous");
    rememberSession(false);
    await mutate(() => true, undefined, { revalidate: false });
    clearPages();
  }, [mutate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setUser(await authApi.me(user.id));
    } catch {
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: UserRole[]) =>
      user !== null && roles.includes(user.role);

    return {
      user,
      status,
      login,
      register,
      logout,
      switchAccount,
      refresh,
      hasRole,
      isStaff: hasRole("OPERATOR", "ADMIN"),
      isAdmin: hasRole("ADMIN"),
    };
  }, [user, status, login, register, logout, switchAccount, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth trebuie folosit în interiorul <AuthProvider>.");
  }
  return context;
}

export function useCurrentUserId(): string | undefined {
  return useAuth().user?.id;
}
