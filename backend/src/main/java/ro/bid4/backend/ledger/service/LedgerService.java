package ro.bid4.backend.ledger.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.domain.LedgerAccount;
import ro.bid4.backend.ledger.domain.LedgerEntry;
import ro.bid4.backend.ledger.domain.LedgerTransaction;
import ro.bid4.backend.ledger.domain.TransactionKind;
import ro.bid4.backend.ledger.repo.LedgerAccountRepository;
import ro.bid4.backend.ledger.repo.LedgerEntryRepository;
import ro.bid4.backend.ledger.repo.LedgerTransactionRepository;

@Service
public class LedgerService {
  private final LedgerAccountRepository accounts;
  private final LedgerTransactionRepository transactions;
  private final LedgerEntryRepository entries;

  public LedgerService(
      LedgerAccountRepository accounts,
      LedgerTransactionRepository transactions,
      LedgerEntryRepository entries) {
    this.accounts = accounts;
    this.transactions = transactions;
    this.entries = entries;
  }

  public record Side(UUID accountId, long amount) {}

  @Transactional
  public LedgerTransaction post(
      TransactionKind kind, String idempotencyKey, UUID orderId, String memo, List<Side> sides) {
    LedgerTransaction existing = transactions.findByIdempotencyKey(idempotencyKey).orElse(null);
    if (existing != null) {
      return existing;
    }

    long total = sides.stream().mapToLong(Side::amount).sum();
    if (total != 0) {
      throw new IllegalArgumentException("Ledger movement does not balance: sides sum to " + total);
    }
    if (sides.isEmpty()) {
      throw new IllegalArgumentException("A movement with no sides is not a movement.");
    }

    LedgerTransaction transaction = new LedgerTransaction();
    transaction.setKind(kind);
    transaction.setOrderId(orderId);
    transaction.setIdempotencyKey(idempotencyKey);
    transaction.setMemo(memo);

    LedgerTransaction saved;
    try {
      saved = transactions.saveAndFlush(transaction);
    } catch (DataIntegrityViolationException raced) {
      return transactions.findByIdempotencyKey(idempotencyKey).orElseThrow(() -> raced);
    }

    List<LedgerEntry> written = new ArrayList<>(sides.size());
    for (Side side : sides) {
      written.add(LedgerEntry.of(saved.getId(), side.accountId(), side.amount()));
      accounts.addToBalance(side.accountId(), side.amount());
    }
    entries.saveAll(written);
    return saved;
  }

  @Transactional
  public LedgerAccount accountFor(AccountKind kind, UUID ownerId) {
    if (!kind.isOwned()) {
      throw new IllegalArgumentException(kind + " is a platform account and has no owner.");
    }
    return accounts.findByKindAndOwnerId(kind, ownerId).orElseGet(() -> open(kind, ownerId));
  }

  @Transactional(readOnly = true)
  public LedgerAccount platform(AccountKind kind) {
    return accounts
        .findPlatform(kind)
        .orElseThrow(
            () -> new ApiException(ErrorCode.INTERNAL, "Contul intern " + kind + " lipsește."));
  }

  @Transactional(readOnly = true)
  public long balanceOf(AccountKind kind, UUID ownerId) {
    return accounts.findByKindAndOwnerId(kind, ownerId).map(LedgerAccount::getBalance).orElse(0L);
  }

  @Transactional(readOnly = true)
  public boolean isConsistent(UUID accountId) {
    LedgerAccount account = accounts.findById(accountId).orElseThrow();
    return account.getBalance() == accounts.sumEntries(accountId);
  }

  private LedgerAccount open(AccountKind kind, UUID ownerId) {
    try {
      return accounts.saveAndFlush(LedgerAccount.of(kind, ownerId));
    } catch (DataIntegrityViolationException raced) {
      return accounts.findByKindAndOwnerId(kind, ownerId).orElseThrow(() -> raced);
    }
  }
}
