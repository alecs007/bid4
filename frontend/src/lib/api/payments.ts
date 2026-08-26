import { USE_MOCK } from "@/lib/config";
import {
  badRequest,
  commit,
  delay,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
} from "@/lib/mock/store";
import type { CardBrand, ID, PaymentMethodCard } from "@/lib/types";

import { http } from "./http";

/**
 * TODO(backend): the real flow is Stripe Connect and nothing here ever sees a card
 * number — a SetupIntent client secret confirmed in the browser with Elements, of
 * which we store only the PaymentMethod id, charged off-session when an auction
 * closes; plus a hosted onboarding URL for sellers and cause organisers.
 *
 * The mock fabricates a card from the last four digits only, precisely because
 * storing anything more would be wrong even in a demo.
 */

/** GET /users/me/payment-methods */
export async function listCards(userId: ID): Promise<PaymentMethodCard[]> {
  if (!USE_MOCK) return http<PaymentMethodCard[]>("/users/me/payment-methods");

  await delay();
  maybeFailRead("metodele de plată");
  const world = getWorld();
  return world.cards.filter((card) => card.userId === userId);
}

export interface AddCardInput {
  /** Only ever the display digits — never a real PAN. */
  last4: string;
  brand: CardBrand;
  expMonth: number;
  expYear: number;
  holderName: string;
}

/** POST /payments/setup-intent, then POST /users/me/payment-methods */
export async function addCard(
  userId: ID,
  input: AddCardInput,
): Promise<PaymentMethodCard> {
  if (!USE_MOCK) {
    return http<PaymentMethodCard>("/users/me/payment-methods", {
      method: "POST",
      body: input,
    });
  }

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Utilizatorul");

  if (!/^\d{4}$/.test(input.last4)) {
    badRequest("Ultimele 4 cifre ale cardului sunt obligatorii.");
  }
  const now = new Date();
  const expired =
    input.expYear < now.getFullYear() ||
    (input.expYear === now.getFullYear() && input.expMonth < now.getMonth() + 1);
  if (expired) badRequest("Cardul este expirat.");

  const card: PaymentMethodCard = {
    id: nextId("pm"),
    userId,
    brand: input.brand,
    last4: input.last4,
    expMonth: input.expMonth,
    expYear: input.expYear,
    holderName: input.holderName.trim(),
    isDefault: true,
  };

  world.cards
    .filter((item) => item.userId === userId)
    .forEach((item) => {
      item.isDefault = false;
    });
  world.cards.push(card);

  // This is what flips half of the bidding gate.
  user.hasPaymentMethod = true;
  commit();
  return card;
}

/** DELETE /users/me/payment-methods/{id} */
export async function removeCard(userId: ID, cardId: ID): Promise<void> {
  if (!USE_MOCK) {
    await http<void>(`/users/me/payment-methods/${cardId}`, {
      method: "DELETE",
    });
    return;
  }

  await delay();
  const world = getWorld();
  const index = world.cards.findIndex(
    (card) => card.id === cardId && card.userId === userId,
  );
  if (index < 0) notFound("Cardul");

  world.cards.splice(index, 1);

  const user = world.users.find((item) => item.id === userId);
  const remaining = world.cards.filter((card) => card.userId === userId);
  if (user) {
    user.hasPaymentMethod = remaining.length > 0;
    if (remaining[0]) remaining[0].isDefault = true;
  }
  commit();
}

export interface PayoutStatus {
  stripeReady: boolean;
  /** Where Stripe would send the user to finish onboarding. */
  onboardingUrl?: string;
  pendingRequirements: string[];
}

/** GET /payments/connect/status */
export async function getPayoutStatus(userId: ID): Promise<PayoutStatus> {
  if (!USE_MOCK) return http<PayoutStatus>("/payments/connect/status");

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Utilizatorul");

  return {
    stripeReady: user.stripeReady,
    onboardingUrl: user.stripeReady ? undefined : "#mock-stripe-onboarding",
    pendingRequirements: user.stripeReady
      ? []
      : [
          "Document de identitate",
          "IBAN pentru încasări",
          "Confirmarea datelor fiscale",
        ],
  };
}

/** POST /payments/connect/onboarding — mocked as an instant success. */
export async function completePayoutOnboarding(
  userId: ID,
): Promise<PayoutStatus> {
  if (!USE_MOCK) {
    return http<PayoutStatus>("/payments/connect/onboarding", {
      method: "POST",
    });
  }

  await delay();
  const world = getWorld();
  const user = world.users.find((item) => item.id === userId);
  if (!user) notFound("Utilizatorul");

  user.stripeReady = true;
  commit();
  return { stripeReady: true, pendingRequirements: [] };
}
