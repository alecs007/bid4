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

/**
 * Who is signed in, for the React tree.
 *
 * <p>It stores nothing itself. The access token is a module variable inside
 * `lib/api/http.ts`, and the only thing that outlives a reload is the httpOnly
 * refresh cookie — so boot asks the API rather than reading storage.
 */

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  /** Dev-only shortcut used by the role switcher. */
  switchAccount: (userId: string) => Promise<User>;
  /** Re-reads the current user after a profile or settings change. */
  refresh: () => Promise<void>;
  /** True when the user's role is one of the accepted roles. */
  hasRole: (...roles: UserRole[]) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const { mutate } = useSWRConfig();

  // All state writes happen after an await, so the effect never triggers a
  // synchronous cascade.
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

  /**
   * Creates the account without signing in. The address is unconfirmed at this
   * point, so there is no session to adopt — the caller goes to their inbox.
   */
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
    // Every answer in the cache was fetched as somebody. Cache keys carry the
    // viewer's id, so the next account cannot read the last one's entries — but
    // the data is still sitting in memory on a machine its owner has just
    // walked away from, and nothing needs it again.
    await mutate(() => true, undefined, { revalidate: false });
    // The cursor-paged lists keep their rows outside SWR, so they are emptied
    // separately or an inbox would survive its own sign-out.
    clearPages();
  }, [mutate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setUser(await authApi.me(user.id));
    } catch {
      // A failed refresh should not sign the user out mid-action.
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
      // ADMIN is a strict superset of OPERATOR everywhere in the app.
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

/** Convenience for components that only need the id, e.g. api calls. */
export function useCurrentUserId(): string | undefined {
  return useAuth().user?.id;
}
