package ro.bid4.backend.ledger.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.domain.TransactionKind;
import ro.bid4.backend.ledger.service.LedgerService.Side;

@Service
public class OrderLedger {
  private final LedgerService ledger;

  public OrderLedger(LedgerService ledger) {
    this.ledger = ledger;
  }

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
