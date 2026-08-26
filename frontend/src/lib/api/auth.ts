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

import { http, writeToken } from "./http";

/** Seven days, matching the mock token's stated lifetime. */
const SESSION_DAYS = 7;

function mockSession(user: User): AuthSession {
  return {
    user,
    token: `mock.${user.id}.${Date.now()}`,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
  };
}

/** POST /auth/login */
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
  return session;
}

/**
 * POST /auth/register
 *
 * Returns the account and no session: the address is unconfirmed, so there is
 * nothing to sign in to yet. The real backend mails a link; the mock world has
 * no post, so a mock account is usable straight away.
 */
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
    // A brand-new account cannot bid yet — that is the point of the gate.
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

/** POST /auth/verify — redeems the link from the confirmation message. */
export async function verifyEmail(token: string): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/auth/verify", { method: "POST", body: { token } });
    return;
  }
  await delay();
}

/** POST /auth/resend-verification — always succeeds, so it reveals no accounts. */
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

/** GET /auth/me — called on boot to restore a session. */
export async function me(userId?: string): Promise<User> {
  if (!USE_MOCK) return http<User>("/auth/me");

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Sesiunea");
  return user;
}

/** POST /auth/logout */
export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    await http<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  writeToken(null);
}

/** Dev-only: no backend counterpart — the role switcher is stripped in prod. */
export async function loginAsSeedAccount(userId: string): Promise<AuthSession> {
  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Contul demo");

  const session = mockSession(user);
  writeToken(session.token);
  return session;
}

/** The four accounts offered on the login screen and the role switcher. */
export async function listSeedAccounts(): Promise<User[]> {
  await delay();
  const world = getWorld();
  return FEATURED_ACCOUNT_IDS.map(
    (id) => world.users.find((user) => user.id === id)!,
  ).filter(Boolean);
}
