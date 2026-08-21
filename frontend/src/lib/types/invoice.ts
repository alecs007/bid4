import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";

/**
 * PLATFORM_FEE     — bid4 invoices the buyer for the 5% platform tax.
 * DONATION_RECEIPT — the cause receipts the donated share (deductible proof).
 * SELLER_PAYOUT    — statement of what was transferred to the seller.
 */
export type InvoiceType =
  | "PLATFORM_FEE"
  | "DONATION_RECEIPT"
  | "SELLER_PAYOUT";

export interface Invoice {
  id: ID;
  orderId: ID;
  orderReference: string;
  type: InvoiceType;
  /** Series + number, e.g. "BID4-2026-000418". */
  number: string;
  amount: Bani;
  /** User id the document is addressed to. */
  issuedToUserId: ID;
  issuedToName: string;
  /** Mock URL today; a signed storage URL once the backend renders real PDFs. */
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
