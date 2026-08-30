/**
 * Every user-visible enum value in Romanian, with its tone. Adding a status to a
 * union without adding it here is a compile error, which is the point.
 */

import type {
  AccountType,
  AuctionStatus,
  BeneficiaryType,
  BidStatus,
  CauseEvidenceType,
  CauseStatus,
  GuardianRelation,
  DeliveryMethodType,
  DisputeReason,
  DisputeStatus,
  InvoiceType,
  OrderStatus,
  ItemCondition,
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
  SOLD: { label: "Vândut", tone: "success" },
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

/**
 * Written from the bidder's side, because that is who reads them: "Ai fost
 * depășit" says what happened to you, where "Depășit" leaves you working out
 * what was depășit and by whom.
 */
export const BID_STATUS: Record<BidStatus, StatusMeta> = {
  ACTIVE: { label: "Ofertă plasată", tone: "sky" },
  OUTBID: {
    label: "Ai fost depășit",
    tone: "accent",
    hint: "Cineva a licitat mai mult decât tine.",
  },
  WINNING: { label: "Ești pe primul loc", tone: "primary" },
  WON: { label: "Ai câștigat", tone: "success" },
  LOST: { label: "Nu ai câștigat", tone: "neutral" },
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

export const ITEM_CONDITION: Record<ItemCondition, string> = {
  NEW: "Nou, cu etichetă",
  LIKE_NEW: "Ca nou",
  VERY_GOOD: "Stare foarte bună",
  GOOD: "Stare bună",
  USED: "Folosit",
};

export const BENEFICIARY_TYPE: Record<BeneficiaryType, string> = {
  INDIVIDUAL: "Persoană fizică",
  MINOR: "Minor",
  NGO: "Organizație / ONG",
};

export const GUARDIAN_RELATION: Record<GuardianRelation, string> = {
  PARENT: "Părinte",
  GRANDPARENT: "Bunic / bunică",
  SIBLING: "Frate / soră major",
  LEGAL_GUARDIAN: "Tutore legal desemnat",
  OTHER: "Altă situație",
};

export const EVIDENCE_TYPE: Record<CauseEvidenceType, string> = {
  MEDICAL_RECORD: "Documente medicale",
  MEDICAL_LETTER: "Scrisoare medicală",
  TREATMENT_QUOTE: "Deviz de tratament",
  SOCIAL_REPORT: "Anchetă socială",
  INCOME_PROOF: "Adeverință de venit",
  SCHOOL_PROOF: "Adeverință de la școală",
  VET_RECORD: "Documente veterinare",
  DAMAGE_PROOF: "Dovada pagubei",
  OTHER: "Alt document",
};

export const DELIVERY_METHOD_TYPE: Record<DeliveryMethodType, string> = {
  EASYBOX: "Easybox",
  HOME_COURIER: "Curier la adresă",
};

export const COPY = {
  escrowExplainer:
    "Plata este păstrată de bid4 și eliberată abia după ce confirmi că ai primit produsul.",
  donationExplainer:
    "Procentul stabilit de vânzător din prețul final ajunge la cauza verificată imediat ce comanda este finalizată.",
  bidGateExplainer:
    "Pentru a licita ai nevoie de un card salvat și de o metodă de livrare implicită, astfel încât comanda să pornească imediat ce câștigi.",
} as const;
