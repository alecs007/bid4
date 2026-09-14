import { USE_MOCK } from "@/lib/config";
import { ApiError } from "@/lib/types";
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/lib/types";
import { avatarImage } from "@/lib/mock/images";
import { DEMO_PASSWORD, FEATURED_ACCOUNT_IDS } from "@/lib/mock/seed";
import {
  badRequest,
  commit,
  delay,
  getWorld,
  nextId,
  notFound,
} from "@/lib/mock/store";

import { slugify, uniqueSlug } from "@/lib/utils/slug";

import { http, refreshSession, writeToken } from "./http";

const SESSION_DAYS = 7;

const MOCK_USER_KEY = "bid4.mock.userId";

export function currentMockUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MOCK_USER_KEY);
}

function rememberMockUser(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(MOCK_USER_KEY, userId);
  else window.localStorage.removeItem(MOCK_USER_KEY);
}

function mockSession(user: User): AuthSession {
  return {
    user,
    token: `mock.${user.id}.${Date.now()}`,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
  };
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  if (!USE_MOCK) {
    const session = await http<AuthSession>("/auth/login", {
      method: "POST",
      body: payload,
    });
    writeToken(session.token);
    return session;
  }

  await delay();
  const world = getWorld();
  const user = world.users.find(
    (item) => item.email.toLowerCase() === payload.email.trim().toLowerCase(),
  );

  if (!user || payload.password !== DEMO_PASSWORD) {
    throw new ApiError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email sau parolă greșite. Parola conturilor demo este „bid4demo”.",
    });
  }
  if (user.status === "SUSPENDED") {
    throw new ApiError({
      status: 403,
      code: "ACCOUNT_SUSPENDED",
      message: "Contul este suspendat. Scrie-ne la ajutor@bid4.ro.",
    });
  }

  const session = mockSession(user);
  writeToken(session.token);
  rememberMockUser(user.id);
  return session;
}

export async function register(payload: RegisterPayload): Promise<User> {
  if (!USE_MOCK) {
    return http<User>("/auth/register", { method: "POST", body: payload });
  }

  await delay();
  const world = getWorld();

  const exists = world.users.some(
    (item) => item.email.toLowerCase() === payload.email.trim().toLowerCase(),
  );
  if (exists) {
    badRequest("Există deja un cont cu acest email.", "EMAIL_TAKEN");
  }
  if (!payload.acceptedTerms) {
    badRequest("Trebuie să accepți termenii ca să continui.", "TERMS_REQUIRED");
  }

  const id = nextId("usr");
  const user: User = {
    id,
    email: payload.email.trim(),
    displayName: payload.displayName.trim(),
    username: uniqueSlug(
      slugify(payload.displayName),
      world.users.map((item) => item.username),
    ),
    role: "USER",
    accountType: payload.accountType,
    status: "ACTIVE",
    orgLegalName: payload.orgLegalName,
    orgRegistrationNumber: payload.orgRegistrationNumber,
    avatarUrl: avatarImage(id, payload.displayName),
    bio: "",
    createdAt: new Date().toISOString(),
    stripeReady: false,
    hasPaymentMethod: false,
    defaultDeliveryMethodId: undefined,
    rating: 0,
    ratingCount: 0,
    totalRaised: 0,
  };

  world.users.push(user);
  commit();
  return user;
}

export async function verifyEmail(token: string): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/auth/verify", { method: "POST", body: { token } });
    return;
  }
  await delay();
}

export async function resendVerification(email: string): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/auth/resend-verification", {
      method: "POST",
      body: { email },
    });
    return;
  }
  await delay();
}

export async function restore(): Promise<User | null> {
  if (!USE_MOCK) return (await refreshSession())?.user ?? null;

  const userId = typeof window === "undefined"
    ? null
    : window.localStorage.getItem(MOCK_USER_KEY);
  if (!userId) return null;

  await delay();
  return getWorld().users.find((item) => item.id === userId) ?? null;
}

export async function me(userId?: string): Promise<User> {
  if (!USE_MOCK) return http<User>("/auth/me");

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Sesiunea");
  return user;
}

export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  writeToken(null);
  rememberMockUser(null);
}

export async function loginAsSeedAccount(userId: string): Promise<AuthSession> {
  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Contul demo");

  const session = mockSession(user);
  writeToken(session.token);
  rememberMockUser(user.id);
  return session;
}

export async function listSeedAccounts(): Promise<User[]> {
  await delay();
  const world = getWorld();
  return FEATURED_ACCOUNT_IDS.map(
    (id) => world.users.find((user) => user.id === id)!,
  ).filter(Boolean);
}
