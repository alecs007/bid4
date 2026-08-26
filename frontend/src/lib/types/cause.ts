import type { Bani, CauseCategoryId } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { PublicUser } from "./user";

/**
 * DRAFT             — organiser is still writing it.
 * PENDING_APPROVAL  — submitted, waiting in the operator queue.
 * APPROVED          — staff said yes; goes ACTIVE once it has a live listing.
 * REJECTED          — staff said no, with a reason the organiser can act on.
 * ACTIVE            — public, visible, can receive listings and donations.
 * SUSPENDED         — pulled from public view by staff.
 */
export type CauseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "SUSPENDED";

/** Only these two are public and may receive listings. */
export const PUBLIC_CAUSE_STATUSES: readonly CauseStatus[] = [
  "APPROVED",
  "ACTIVE",
];

/**
 * A cause may be raised for a private person, which is why identity sits at the
 * centre of this model: an NGO can be checked against a register, a person cannot.
 */
export type BeneficiaryType = "INDIVIDUAL" | "MINOR" | "NGO";

export type GuardianRelation =
  | "PARENT"
  | "GRANDPARENT"
  | "SIBLING"
  | "LEGAL_GUARDIAN"
  | "OTHER";

/**
 * TODO(backend): POST /uploads returns `fileRef`. Today it is minted in the
 * browser, `previewUrl` is an object URL, and no bytes leave the page.
 */
export interface UploadedFileRef {
  fileName: string;
  fileRef: string;
  sizeBytes: number;
  mimeType: string;
  previewUrl?: string;
}

export interface CauseBeneficiary {
  fullName: string;
  /** TODO(backend): the ID document goes to KYC, never to a public endpoint. */
  idDocumentRef?: UploadedFileRef;
  contactEmail: string;
  contactPhone: string;
  county: string;
  city: string;
  /** MINOR only — the child's age, kept because it changes what staff check. */
  age?: number;
}

/** Required when the beneficiary is a MINOR. Money is paid to this person. */
export interface CauseGuardian {
  fullName: string;
  idDocumentRef?: UploadedFileRef;
  relationToMinor: GuardianRelation;
  guardianshipProofRef?: UploadedFileRef;
  phone: string;
}

export interface CauseNgo {
  legalName: string;
  /** CUI. */
  registrationNumber: string;
  statuteDocRef?: UploadedFileRef;
  representativeName: string;
  representativeIdRef?: UploadedFileRef;
}

export type CauseEvidenceType =
  | "MEDICAL_RECORD"
  | "MEDICAL_LETTER"
  | "TREATMENT_QUOTE"
  | "SOCIAL_REPORT"
  | "INCOME_PROOF"
  | "SCHOOL_PROOF"
  | "VET_RECORD"
  | "DAMAGE_PROOF"
  | "OTHER";

/** Evidence for the story itself, as opposed to evidence of who someone is. */
export interface CauseEvidence {
  id: ID;
  type: CauseEvidenceType;
  fileName: string;
  fileRef: string;
  note?: string;
}

export type PayoutMethod = "STRIPE_INDIVIDUAL" | "STRIPE_NGO";

export interface CausePayout {
  method: PayoutMethod;
  iban?: string;
  /** TODO(backend): flipped by the Stripe Connect onboarding return URL. */
  stripeOnboarded: boolean;
}

export type VerificationStatus =
  | "UNVERIFIED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface CauseVerification {
  status: VerificationStatus;
  /** What the cause may raise before verification completes. */
  cap?: Bani;
  rejectionReason?: string;
}

/** What the organiser signed, kept so an operator can see it was asked. */
export interface CauseConsents {
  truthfulness: boolean;
  controlledRelease: boolean;
  terms: boolean;
  /** MINOR only. */
  guardianAuthority?: boolean;
  acceptedAt: ISODateString;
}

export type CauseDocumentKind =
  | "STATUTE"
  | "REGISTRATION_CERTIFICATE"
  | "ID_DOCUMENT"
  | "BANK_PROOF"
  | "OTHER";

export interface CauseDocument {
  id: ID;
  kind: CauseDocumentKind;
  fileName: string;
  /** Mock object-storage reference; a signed S3 URL later. */
  fileUrl: string;
  sizeBytes: number;
  uploadedAt: ISODateString;
}

/** The paperwork an operator checks before approving. */
export interface CauseValidation {
  legalName: string;
  /** CUI for organisations, CNP-less personal declaration for individuals. */
  registrationNumber: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  documents: CauseDocument[];
  /** IBAN where released donations land. Masked everywhere except staff views. */
  payoutAccountRef: string;
}

export interface Cause {
  id: ID;
  name: string;
  slug: string;
  shortDescription: string;
  /** Long-form markdown-ish story shown on the cause page. */
  story: string;
  category: CauseCategoryId;
  imageUrl: string;
  coverUrl: string;
  /** Extra photographs of the work, shown as a gallery on the cause page. */
  gallery: string[];

  organizerId: ID;
  status: CauseStatus;
  validation: CauseValidation;

  beneficiaryType: BeneficiaryType;
  beneficiary: CauseBeneficiary;
  guardian?: CauseGuardian;
  ngo?: CauseNgo;
  /** Supporting evidence for the story. */
  documents: CauseEvidence[];
  payout: CausePayout;
  verification: CauseVerification;
  consents?: CauseConsents;

  goalAmount: Bani;
  raisedAmount: Bani;
  /** Number of orders that have released money to this cause. */
  supporterCount: number;
  deadline?: ISODateString;

  rejectionReason?: string;
  createdAt: ISODateString;
  submittedAt?: ISODateString;
  approvedAt?: ISODateString;
}

/** Cause plus the joins the UI almost always needs. */
export interface CauseDetail extends Cause {
  organizer: PublicUser;
  activeAuctionCount: number;
}

/**
 * The wizard's own shape: every field a string or a file ref, so a half-finished
 * application survives a reload and a JSON round trip.
 */
export interface CauseApplicationDraft {
  beneficiaryType?: BeneficiaryType;
  beneficiary: {
    fullName: string;
    contactEmail: string;
    contactPhone: string;
    county: string;
    city: string;
    /** MINOR only. */
    age: string;
    idDocument?: UploadedFileRef;
  };
  guardian: {
    fullName: string;
    relationToMinor: GuardianRelation | "";
    phone: string;
    idDocument?: UploadedFileRef;
    guardianshipProof?: UploadedFileRef;
  };
  ngo: {
    legalName: string;
    registrationNumber: string;
    representativeName: string;
    statuteDoc?: UploadedFileRef;
    representativeId?: UploadedFileRef;
  };
  story: {
    name: string;
    category: CauseCategoryId | "";
    shortDescription: string;
    story: string;
    location: string;
    coverImage?: UploadedFileRef;
    gallery: UploadedFileRef[];
  };
  documents: {
    id: string;
    type: CauseEvidenceType | "";
    note: string;
    file?: UploadedFileRef;
  }[];
  goal: {
    amountLei: string;
    deadline: string;
  };
  payout: {
    method: PayoutMethod;
    iban: string;
    stripeOnboarded: boolean;
  };
  consents: {
    truthfulness: boolean;
    controlledRelease: boolean;
    terms: boolean;
    guardianAuthority: boolean;
  };
}

/** A draft parked on the server between visits. */
export interface CauseDraftRecord {
  id: ID;
  organizerId: ID;
  /** Zero-based index of the furthest step reached. */
  step: number;
  data: CauseApplicationDraft;
  updatedAt: ISODateString;
}

/** What `createCause` accepts — the validated application. */
export interface CauseApplicationPayload {
  beneficiaryType: BeneficiaryType;
  beneficiary: CauseBeneficiary;
  guardian?: CauseGuardian;
  ngo?: CauseNgo;

  name: string;
  shortDescription: string;
  story: string;
  category: CauseCategoryId;
  location: string;
  coverImage?: UploadedFileRef;
  gallery: UploadedFileRef[];

  documents: Omit<CauseEvidence, "id">[];
  goalAmount: Bani;
  deadline?: ISODateString;
  payout: CausePayout;
  consents: Omit<CauseConsents, "acceptedAt">;
}
