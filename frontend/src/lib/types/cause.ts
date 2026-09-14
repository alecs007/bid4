import type { Bani, CauseCategoryId } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { PublicUser } from "./user";

export type CauseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "SUSPENDED";

export const PUBLIC_CAUSE_STATUSES: readonly CauseStatus[] = [
  "APPROVED",
  "ACTIVE",
];

export type BeneficiaryType = "INDIVIDUAL" | "MINOR" | "NGO";

export type GuardianRelation =
  | "PARENT"
  | "GRANDPARENT"
  | "SIBLING"
  | "LEGAL_GUARDIAN"
  | "OTHER";

// TODO(backend): POST /uploads returns fileRef; today it is minted in the browser.
export interface UploadedFileRef {
  fileName: string;
  fileRef: string;
  sizeBytes: number;
  mimeType: string;
  previewUrl?: string;
}

export interface CauseBeneficiary {
  fullName: string;
  // TODO(backend): the ID document goes to KYC, never to a public endpoint.
  idDocumentRef?: UploadedFileRef;
  contactEmail: string;
  contactPhone: string;
  county: string;
  city: string;
  age?: number;
}

export interface CauseGuardian {
  fullName: string;
  idDocumentRef?: UploadedFileRef;
  relationToMinor: GuardianRelation;
  guardianshipProofRef?: UploadedFileRef;
  phone: string;
}

export interface CauseNgo {
  legalName: string;
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
  // TODO(backend): flipped by the Stripe Connect onboarding return URL.
  stripeOnboarded: boolean;
}

export type VerificationStatus =
  | "UNVERIFIED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface CauseVerification {
  status: VerificationStatus;
  cap?: Bani;
  rejectionReason?: string;
}

export interface CauseConsents {
  truthfulness: boolean;
  controlledRelease: boolean;
  terms: boolean;
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
  fileUrl: string;
  sizeBytes: number;
  uploadedAt: ISODateString;
}

export interface CauseValidation {
  legalName: string;
  registrationNumber: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  documents: CauseDocument[];
  payoutAccountRef: string;
}

export interface Cause {
  id: ID;
  name: string;
  slug: string;
  shortDescription: string;
  story: string;
  category: CauseCategoryId;
  imageUrl: string;
  coverUrl: string;
  gallery: string[];

  organizerId: ID;
  status: CauseStatus;
  validation: CauseValidation;

  beneficiaryType: BeneficiaryType;
  beneficiary: CauseBeneficiary;
  guardian?: CauseGuardian;
  ngo?: CauseNgo;
  documents: CauseEvidence[];
  payout: CausePayout;
  verification: CauseVerification;
  consents?: CauseConsents;

  goalAmount: Bani;
  raisedAmount: Bani;
  supporterCount: number;
  deadline?: ISODateString;

  rejectionReason?: string;
  createdAt: ISODateString;
  submittedAt?: ISODateString;
  approvedAt?: ISODateString;
}

export interface CauseDetail extends Cause {
  organizer: PublicUser;
  activeAuctionCount: number;
}

export interface CauseApplicationDraft {
  beneficiaryType?: BeneficiaryType;
  beneficiary: {
    fullName: string;
    contactEmail: string;
    contactPhone: string;
    county: string;
    city: string;
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

export interface CauseDraftRecord {
  id: ID;
  organizerId: ID;
  step: number;
  data: CauseApplicationDraft;
  updatedAt: ISODateString;
}

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
