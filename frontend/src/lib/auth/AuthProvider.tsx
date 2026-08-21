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

import * as authApi from "@/lib/api/auth";
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
  UserRole,
} from "@/lib/types";

/**
 * Mock authentication with the shape real JWT auth will have.
 *
 * Today: the signed-in user id is kept in localStorage and re-read on boot via
 * `auth.me(id)`. After the swap, `auth.me()` calls `GET /auth/me` with the
 * bearer token that `lib/api/http.ts` already attaches — and nothing in this
 * file needs to change beyond dropping the stored id argument.
 */

const USER_KEY = "bid4.userId";

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

function storeUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(USER_KEY, userId);
  else window.localStorage.removeItem(USER_KEY);
}

function readUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Restore the session on boot. All state writes happen after an await, so
  // the effect never triggers a synchronous cascade.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const storedId = readUserId();
      if (!storedId) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      try {
        const restored = await authApi.me(storedId);
        if (cancelled) return;
        setUser(restored);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        storeUserId(null);
        setUser(null);
        setStatus("anonymous");
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = useCallback((session: AuthSession) => {
    storeUserId(session.user.id);
    setUser(session.user);
    setStatus("authenticated");
    return session.user;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => adopt(await authApi.login(payload)),
    [adopt],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => adopt(await authApi.register(payload)),
    [adopt],
  );

  const switchAccount = useCallback(
    async (userId: string) => adopt(await authApi.loginAsSeedAccount(userId)),
    [adopt],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    storeUserId(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refresh = useCallback(async () => {
    const storedId = readUserId();
    if (!storedId) return;
    try {
      setUser(await authApi.me(storedId));
    } catch {
      // A failed refresh should not sign the user out mid-action.
    }
  }, []);

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
