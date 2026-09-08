package ro.bid4.backend.ledger.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.domain.TransactionKind;
import ro.bid4.backend.ledger.service.LedgerService.Side;

/**
 * What a sale does to the books.
 *
 * <p>Three movements, and the escrow is the whole idea: money paid by a buyer sits in bid4's own
 * account owing to nobody until the parcel is confirmed, and only then divides. Until that moment
 * there is nothing in anybody's balance to withdraw, which is what the promise on the listing page
 * actually means.
 *
 * <p>Every key is derived from the order, so retrying any of this is free: the same payment, the
 * same release and the same refund can be asked for as many times as a webhook or a crashed job
 * likes, and the money moves once.
 */
@Service
public class OrderLedger {

  private final LedgerService ledger;

  public OrderLedger(LedgerService ledger) {
    this.ledger = ledger;
  }

  /**
   * A buyer paid.
   *
   * <p>The whole of it lands in escrow — the price, the tax and the delivery together — because
   * dividing it now would mean bid4 had taken its cut before doing the thing the cut is for.
   */
  @Transactional
  public void recordPayment(UUID orderId, long totalPaid) {
    ledger.post(
        TransactionKind.PAYMENT,
        "order:" + orderId + ":payment",
        orderId,
        "Plată primită, ținută în escrow",
        List.of(
            new Side(ledger.platform(AccountKind.EXTERNAL).getId(), -totalPaid),
            new Side(ledger.platform(AccountKind.PLATFORM_ESCROW).getId(), totalPaid)));
  }

  /**
   * The parcel arrived and the buyer said so.
   *
   * <p>Escrow empties into four places at once: the cause, the seller, the courier's money and
   * bid4's own. The four add up to what was paid, which is checked twice — by the sides summing to
   * zero here, and by the orders table's own arithmetic when the sale was written.
   */
  @Transactional
  public void recordRelease(
      UUID orderId,
      UUID sellerId,
      UUID causeId,
      long totalPaid,
      long donationAmount,
      long sellerShare,
      long platformTax,
      long shipping) {

    List<Side> sides = new ArrayList<>();
    sides.add(new Side(ledger.platform(AccountKind.PLATFORM_ESCROW).getId(), -totalPaid));

    if (donationAmount > 0) {
      sides.add(
          new Side(
              ledger.accountFor(AccountKind.CAUSE_AVAILABLE, causeId).getId(), donationAmount));
    }
    if (sellerShare > 0) {
      sides.add(
          new Side(ledger.accountFor(AccountKind.USER_AVAILABLE, sellerId).getId(), sellerShare));
    }
    if (platformTax > 0) {
      sides.add(new Side(ledger.platform(AccountKind.PLATFORM_REVENUE).getId(), platformTax));
    }
    if (shipping > 0) {
      sides.add(new Side(ledger.platform(AccountKind.PLATFORM_SHIPPING).getId(), shipping));
    }

    ledger.post(
        TransactionKind.RELEASE,
        "order:" + orderId + ":release",
        orderId,
        "Comandă încheiată, fonduri eliberate",
        sides);
  }

  /**
   * The sale did not happen after all.
   *
   * <p>Straight back out of escrow to where it came from, and nowhere near anybody's balance —
   * refunding money that has already been divided is a different and much worse problem, which is
   * why release is the one thing that ever divides it.
   */
  @Transactional
  public void recordRefund(UUID orderId, long amount) {
    ledger.post(
        TransactionKind.REFUND,
        "order:" + orderId + ":refund",
        orderId,
        "Comandă anulată, bani returnați",
        List.of(
            new Side(ledger.platform(AccountKind.PLATFORM_ESCROW).getId(), -amount),
            new Side(ledger.platform(AccountKind.EXTERNAL).getId(), amount)));
  }
}
