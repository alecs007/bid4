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

  goalAmount: Bani;
  raisedAmount: Bani;
  /** Number of orders that have released money to this cause. */
  supporterCount: number;

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

export interface CauseDraftPayload {
  name: string;
  shortDescription: string;
  story: string;
  category: CauseCategoryId;
  imageUrl?: string;
  goalAmount: Bani;
  validation: Omit<CauseValidation, "documents"> & {
    documents: Omit<CauseDocument, "id" | "uploadedAt">[];
  };
}
