import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";

/**
 * ONE end-user role. An individual and an organisation are both `USER` and have
 * identical permissions — "Organizația X" can buy a lamp today and open a cause
 * next week from the same account. `accountType` only changes what the profile
 * shows and which fields the cause-validation form asks for.
 *
 * OPERATOR = staff moderation (causes, orders, disputes).
 * ADMIN    = strict superset of OPERATOR + users, roles, settings, reports.
 */
export type UserRole = "USER" | "OPERATOR" | "ADMIN";

export type AccountType = "INDIVIDUAL" | "ORGANIZATION";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface User {
  id: ID;
  email: string;
  displayName: string;
  /** Slug used by the public profile route `/profil/[username]`. */
  username: string;
  role: UserRole;
  accountType: AccountType;
  status: UserStatus;

  /** Only meaningful when accountType === "ORGANIZATION". */
  orgLegalName?: string;
  orgRegistrationNumber?: string;

  avatarUrl: string;
  bio: string;
  city?: string;
  createdAt: ISODateString;

  /** Stripe Connect onboarding finished — required to receive payouts. */
  stripeReady: boolean;
  /** A card is on file — one half of the gate that unlocks bidding. */
  hasPaymentMethod: boolean;
  /** The other half of the gate. */
  defaultDeliveryMethodId?: ID;

  /** 0–5, averaged over completed orders. */
  rating: number;
  ratingCount: number;
  /** Denormalised: total donated through this user's sales and purchases. */
  totalRaised: Bani;
}

/** What `/profil/[username]` may show to anyone, logged in or not. */
export type PublicUser = Pick<
  User,
  | "id"
  | "displayName"
  | "username"
  | "accountType"
  | "orgLegalName"
  | "avatarUrl"
  | "bio"
  | "city"
  | "createdAt"
  | "rating"
  | "ratingCount"
  | "totalRaised"
>;

/* -------------------------------------------------------------------------- */

export type DeliveryMethodType = "EASYBOX" | "HOME_COURIER";

export interface DeliveryMethod {
  id: ID;
  userId: ID;
  type: DeliveryMethodType;
  /** User-chosen nickname, e.g. "Easybox de lângă birou". */
  label: string;

  /** EASYBOX only. */
  easyboxLockerId?: string;
  lockerName?: string;
  lockerAddress?: string;

  /** HOME_COURIER only. */
  homeAddress?: HomeAddress;

  phone: string;
  isDefault: boolean;
}

export interface HomeAddress {
  recipientName: string;
  street: string;
  city: string;
  county: string;
  postalCode: string;
  details?: string;
}

/* -------------------------------------------------------------------------- */

export type CardBrand = "visa" | "mastercard" | "amex" | "other";

/**
 * Mirrors what Stripe safely exposes about a saved card. We never hold a PAN;
 * the real thing is a PaymentMethod id attached to the customer.
 */
export interface PaymentMethodCard {
  id: ID;
  userId: ID;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
}

/* -------------------------------------------------------------------------- */

export interface AuthSession {
  user: User;
  /** Mock token today; a real JWT after the backend swap. */
  token: string;
  expiresAt: ISODateString;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  accountType: AccountType;
  orgLegalName?: string;
  orgRegistrationNumber?: string;
  acceptedTerms: boolean;
}
