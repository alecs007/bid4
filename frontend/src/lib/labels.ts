/**
 * Every enum value the user can see, in Romanian, with the visual tone the
 * design system should paint it in. Code stays English; humans read Romanian.
 *
 * Adding a status to a union without adding it here is a compile error, which
 * is exactly what we want.
 */

import type {
  AccountType,
  AuctionStatus,
  BidStatus,
  CauseStatus,
  DeliveryMethodType,
  DisputeReason,
  DisputeStatus,
  InvoiceType,
  OrderStatus,
  ProductCondition,
  UserRole,
} from "@/lib/types";

export type Tone =
  | "primary"
  | "accent"
  | "sky"
  | "sun"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export interface StatusMeta {
  label: string;
  tone: Tone;
  /** Optional one-line explanation shown in tooltips and timelines. */
  hint?: string;
}

/* -------------------------------------------------------------------------- */

export const AUCTION_STATUS: Record<AuctionStatus, StatusMeta> = {
  DRAFT: { label: "Ciornă", tone: "neutral" },
  PENDING_REVIEW: {
    label: "În verificare",
    tone: "sun",
    hint: "Echipa bid4 verifică anunțul înainte de publicare.",
  },
  SCHEDULED: {
    label: "Programată",
    tone: "sky",
    hint: "Licitația începe la data programată.",
  },
  LIVE: { label: "În desfășurare", tone: "primary", hint: "Poți licita acum." },
  ENDED: { label: "Încheiată", tone: "neutral" },
  SOLD: { label: "Adjudecată", tone: "success" },
  UNSOLD: {
    label: "Fără câștigător",
    tone: "neutral",
    hint: "Nu s-a atins prețul de rezervă.",
  },
  CANCELLED: { label: "Anulată", tone: "danger" },
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  AWAITING_CONFIRMATION: {
    label: "Așteaptă confirmarea",
    tone: "sun",
    hint: "Câștigătorul confirmă datele de livrare.",
  },
  AWAITING_PAYMENT: {
    label: "Așteaptă plata",
    tone: "sun",
    hint: "Procesăm plata cu cardul salvat.",
  },
  PAYMENT_FAILED: {
    label: "Plată eșuată",
    tone: "danger",
    hint: "Cardul a fost refuzat. Încearcă din nou sau schimbă cardul.",
  },
  PAID_HELD: {
    label: "Fonduri reținute",
    tone: "sky",
    hint: "Banii sunt păstrați în siguranță de bid4 până la livrare.",
  },
  LABEL_GENERATED: {
    label: "Etichetă generată",
    tone: "sky",
    hint: "Vânzătorul poate descărca eticheta AWB.",
  },
  DROPPED_OFF: { label: "Predat la Easybox", tone: "sky" },
  IN_TRANSIT: { label: "În tranzit", tone: "sky" },
  ARRIVED_AT_LOCKER: {
    label: "Ajuns la Easybox",
    tone: "primary",
    hint: "Coletul te așteaptă la locker.",
  },
  DELIVERED: { label: "Livrat", tone: "primary" },
  COMPLETED: {
    label: "Finalizată",
    tone: "success",
    hint: "Fondurile au fost eliberate către cauză și vânzător.",
  },
  DISPUTE_OPEN: {
    label: "Dispută deschisă",
    tone: "danger",
    hint: "Eliberarea fondurilor este blocată până la rezolvare.",
  },
  DISPUTE_RESOLVED: { label: "Dispută rezolvată", tone: "sky" },
  REFUNDED: { label: "Rambursată", tone: "neutral" },
  CANCELLED: { label: "Anulată", tone: "neutral" },
};

export const CAUSE_STATUS: Record<CauseStatus, StatusMeta> = {
  DRAFT: { label: "Ciornă", tone: "neutral" },
  PENDING_APPROVAL: {
    label: "În așteptare",
    tone: "sun",
    hint: "Documentele sunt verificate de echipa bid4.",
  },
  APPROVED: { label: "Aprobată", tone: "success" },
  REJECTED: { label: "Respinsă", tone: "danger" },
  ACTIVE: { label: "Activă", tone: "primary" },
  SUSPENDED: { label: "Suspendată", tone: "warning" },
};

export const BID_STATUS: Record<BidStatus, StatusMeta> = {
  ACTIVE: { label: "Ofertă plasată", tone: "sky" },
  OUTBID: { label: "Depășit", tone: "warning", hint: "Cineva a licitat mai mult." },
  WINNING: { label: "Câștigi", tone: "primary" },
  WON: { label: "Câștigat", tone: "success" },
  LOST: { label: "Pierdut", tone: "neutral" },
};

export const DISPUTE_STATUS: Record<DisputeStatus, StatusMeta> = {
  OPEN: { label: "Deschisă", tone: "danger" },
  UNDER_REVIEW: { label: "În analiză", tone: "sun" },
  RESOLVED_REFUND: { label: "Rambursare integrală", tone: "neutral" },
  RESOLVED_RELEASE: { label: "Fonduri eliberate", tone: "success" },
  RESOLVED_PARTIAL: { label: "Rezolvare parțială", tone: "sky" },
};

export const DISPUTE_REASON: Record<DisputeReason, string> = {
  NOT_RECEIVED: "Nu am primit coletul",
  NOT_AS_DESCRIBED: "Nu corespunde descrierii",
  DAMAGED: "Produs deteriorat",
  COUNTERFEIT: "Produs contrafăcut",
  OTHER: "Alt motiv",
};

export const INVOICE_TYPE: Record<InvoiceType, StatusMeta> = {
  PLATFORM_FEE: { label: "Taxă platformă", tone: "neutral" },
  DONATION_RECEIPT: { label: "Chitanță donație", tone: "primary" },
  SELLER_PAYOUT: { label: "Plată vânzător", tone: "sky" },
};

export const USER_ROLE: Record<UserRole, StatusMeta> = {
  USER: { label: "Utilizator", tone: "primary" },
  OPERATOR: { label: "Operator", tone: "sky" },
  ADMIN: { label: "Administrator", tone: "accent" },
};

export const ACCOUNT_TYPE: Record<AccountType, string> = {
  INDIVIDUAL: "Persoană fizică",
  ORGANIZATION: "Organizație",
};

export const PRODUCT_CONDITION: Record<ProductCondition, string> = {
  NEW: "Nou, cu etichetă",
  LIKE_NEW: "Ca nou",
  VERY_GOOD: "Stare foarte bună",
  GOOD: "Stare bună",
  USED: "Folosit",
};

export const DELIVERY_METHOD_TYPE: Record<DeliveryMethodType, string> = {
  EASYBOX: "Easybox",
  HOME_COURIER: "Curier la adresă",
};

/* -------------------------------------------------------------------------- */

/** "acum 3 minute" style helpers live in lib/utils/date.ts — labels stay here. */
export const COPY = {
  escrowExplainer:
    "Banii tăi sunt păstrați în siguranță de bid4 și sunt trimiși mai departe abia după ce confirmi că ai primit produsul.",
  donationExplainer:
    "Procentul ales de vânzător din prețul final merge direct către cauza verificată, imediat ce comanda este finalizată.",
  bidGateExplainer:
    "Ca să poți licita, ai nevoie de un card salvat și de o metodă de livrare implicită. Așa comanda pleacă instant când câștigi.",
} as const;
