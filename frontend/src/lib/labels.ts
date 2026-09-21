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
  hint?: string;
}

export const AUCTION_STATUS: Record<AuctionStatus, StatusMeta> = {
  DRAFT: { label: "Ciornă", tone: "neutral" },
  PENDING_REVIEW: {
    label: "În verificare",
    tone: "sun",
    hint: "Echipa bid4 verifică anunțul înainte de publicare.",
  },
  LIVE: {
    label: "În desfășurare",
    tone: "primary",
    hint: "Poți face o ofertă acum.",
  },
  RESERVED: {
    label: "Ofertă acceptată",
    tone: "sky",
    hint: "Vânzătorul a ales o ofertă și așteaptă plata.",
  },
  SOLD: { label: "Vândut", tone: "success" },
  CANCELLED: { label: "Retras", tone: "neutral" },
};

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  AWAITING_CONFIRMATION: {
    label: "Livrare de ales",
    tone: "sun",
    hint: "Cumpărătorul urmează să aleagă modalitatea de livrare.",
  },
  AWAITING_PAYMENT: {
    label: "Plată în așteptare",
    tone: "sun",
    hint: "Expedierea se face numai după înregistrarea plății.",
  },
  PAYMENT_FAILED: {
    label: "Plată nefinalizată",
    tone: "danger",
    hint: "Comanda rămâne valabilă și plata poate fi reluată.",
  },
  PAID_HELD: {
    label: "Plată înregistrată",
    tone: "sky",
    hint: "Suma este păstrată de bid4 până la confirmarea livrării.",
  },
  LABEL_GENERATED: {
    label: "Etichetă emisă",
    tone: "sky",
    hint: "Coletul urmează să fie predat curierului.",
  },
  DROPPED_OFF: { label: "Preluat de curier", tone: "sky" },
  IN_TRANSIT: { label: "În tranzit", tone: "sky" },
  ARRIVED_AT_LOCKER: {
    label: "Disponibil pentru ridicare",
    tone: "primary",
    hint: "Coletul poate fi ridicat de cumpărător.",
  },
  DELIVERED: {
    label: "Livrat",
    tone: "primary",
    hint: "Se așteaptă confirmarea din partea cumpărătorului.",
  },
  COMPLETED: {
    label: "Finalizată",
    tone: "success",
    hint: "Suma a fost eliberată către cauză și către vânzător.",
  },
  DISPUTE_OPEN: {
    label: "Sesizare în analiză",
    tone: "danger",
    hint: "Suma rămâne blocată până la soluționare.",
  },
  DISPUTE_RESOLVED: { label: "Sesizare soluționată", tone: "sky" },
  REFUNDED: { label: "Sumă restituită", tone: "neutral" },
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
  OUTBID: {
    label: "Ai fost depășit",
    tone: "accent",
    hint: "Cineva a oferit mai mult decât tine.",
  },
  WINNING: { label: "Ești pe primul loc", tone: "primary" },
  ACCEPTED: {
    label: "Oferta ta a fost acceptată",
    tone: "success",
    hint: "Vânzătorul te-a ales. Urmează plata.",
  },
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

export const ITEM_CONDITION_LEVEL: Record<ItemCondition, number> = {
  NEW: 5,
  LIKE_NEW: 4,
  VERY_GOOD: 3,
  GOOD: 2,
  USED: 1,
};

export const CONDITION_LEVELS = 5;

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
    "Plata este păstrată de bid4 și eliberată după finalizarea comenzii.",
  donationExplainer:
    "Procentul stabilit de vânzător din prețul final ajunge la cauza verificată imediat ce comanda este finalizată.",
  noClockExplainer:
    "Anunțul rămâne deschis până când vânzătorul alege o ofertă. Nu există numărătoare inversă.",
} as const;
