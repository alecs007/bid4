import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { PublicUser } from "./user";

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED_REFUND"
  | "RESOLVED_RELEASE"
  | "RESOLVED_PARTIAL";

export type DisputeReason =
  | "NOT_RECEIVED"
  | "NOT_AS_DESCRIBED"
  | "DAMAGED"
  | "COUNTERFEIT"
  | "OTHER";

export interface Dispute {
  id: ID;
  orderId: ID;
  orderReference: string;
  openedBy: ID;
  reason: DisputeReason;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  operatorId?: ID;
  resolutionNote?: string;
  refundAmount?: Bani;
  createdAt: ISODateString;
  resolvedAt?: ISODateString;
}

export interface DisputeDetail extends Dispute {
  buyer: PublicUser;
  seller: PublicUser;
  operator?: PublicUser;
  orderTotal: Bani;
  itemTitle: string;
  itemImage: string;
}

export interface OpenDisputePayload {
  orderId: ID;
  reason: DisputeReason;
  description: string;
  evidenceUrls?: string[];
}

export interface ResolveDisputePayload {
  disputeId: ID;
  resolution: "RESOLVED_REFUND" | "RESOLVED_RELEASE" | "RESOLVED_PARTIAL";
  resolutionNote: string;
  refundAmount?: Bani;
}
