import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";

export type UserRole = "USER" | "OPERATOR" | "ADMIN";

export type AccountType = "INDIVIDUAL" | "ORGANIZATION";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface User {
  id: ID;
  email: string;
  displayName: string;
  username: string;
  role: UserRole;
  accountType: AccountType;
  status: UserStatus;

  orgLegalName?: string;
  orgRegistrationNumber?: string;

  avatarUrl: string;
  bio: string;
  // TODO(backend): not on PublicUserResponse yet, so undefined against the real API.
  verified?: boolean;
  city?: string;
  createdAt: ISODateString;

  stripeReady: boolean;
  hasPaymentMethod: boolean;
  defaultDeliveryMethodId?: ID;

  rating: number;
  ratingCount: number;
  totalRaised: Bani;
}

export type PublicUser = Pick<
  User,
  | "id"
  | "displayName"
  | "username"
  | "accountType"
  | "orgLegalName"
  | "avatarUrl"
  | "bio"
  | "verified"
  | "city"
  | "createdAt"
  | "rating"
  | "ratingCount"
  | "totalRaised"
>;

export type DeliveryMethodType = "EASYBOX" | "HOME_COURIER";

export interface DeliveryMethod {
  id: ID;
  userId: ID;
  type: DeliveryMethodType;
  label: string;

  easyboxLockerId?: string;
  lockerName?: string;
  lockerAddress?: string;

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

export type CardBrand = "visa" | "mastercard" | "amex" | "other";

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

export interface AuthSession {
  user: User;
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
