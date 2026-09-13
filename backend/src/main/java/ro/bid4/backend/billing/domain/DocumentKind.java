package ro.bid4.backend.billing.domain;

/**
 * A document a sale produces, and who it is addressed to.
 *
 * <p>Five, because five different parties need five different pieces of paper out of one
 * transaction. Collapsing them into "the invoice" is what makes a marketplace's paperwork
 * impossible to reconcile later: the buyer's receipt, the platform's revenue, the cause's
 * deductible proof and the seller's payout are four separate legal facts.
 *
 * <p>Which of these bid4 may actually issue depends on the merchant-of-record question that is
 * still open. The enum is deliberately larger than what is issued today so that answering it means
 * choosing from this list rather than changing a schema.
 */
public enum DocumentKind {
  /**
   * To the buyer, when the total becomes known. Not a fiscal document; a statement of what is due.
   */
  PROFORMA,
  /** To the buyer, once the sale completes. What bid4 invoices depends on merchant of record. */
  INVOICE,
  /**
   * To the cause, for the donated share. The deductible proof, and the reason they can accept it.
   */
  DONATION_RECEIPT,
  /** To the seller, when the money is released. What was transferred, and what was withheld. */
  PAYOUT_STATEMENT,
  /** To the seller, at booking. The courier's document, stored so it can be fetched again. */
  SHIPPING_LABEL
}
