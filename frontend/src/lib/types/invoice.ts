import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";

export type InvoiceType =
  | "PLATFORM_FEE"
  | "DONATION_RECEIPT"
  | "SELLER_PAYOUT";

export interface Invoice {
  id: ID;
  orderId: ID;
  orderReference: string;
  type: InvoiceType;
  number: string;
  amount: Bani;
  issuedToUserId: ID;
  issuedToName: string;
  pdfUrl: string;
  createdAt: ISODateString;
}

export interface InvoiceFilters {
  type?: InvoiceType[];
  year?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}
