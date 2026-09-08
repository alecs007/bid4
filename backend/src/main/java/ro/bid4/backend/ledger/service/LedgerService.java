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

/**
 * The only thing in the application allowed to move money.
 *
 * <p>Everything goes through {@link #post}: a kind, an idempotency key, and a list of sides that
 * add to zero. There is no method here for adding to one balance, because a balance that can be
 * added to on its own is a balance that will one day be added to on its own.
 *
 * <p>Posting the same key twice is a no-op rather than an error. That is the point of it — a
 * webhook delivered twice, a job that ran again after a crash and a button pressed on two tabs all
 * want the same outcome, which is that the money moved exactly once and everybody can stop worrying
 * about how many times they asked.
 *
 * <p>Nothing is ever updated or deleted. A mistake is corrected by posting its reverse, and the
 * database refuses anything else.
 */
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

  /** One side of a movement: an account, and how much goes into it. Negative comes out. */
  public record Side(UUID accountId, long amount) {}

  /**
   * Writes one movement.
   *
   * <p>The sides must add to zero. That is checked here so the failure is a readable exception, and
   * again by a deferred trigger in the database so that being careful here is not the only thing
   * standing between the books and nonsense.
   *
   * @return the transaction, whether it was written now or by whoever got here first
   */
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
      // Somebody else posted the same key between the read and the write. Their
      // movement is the one that happened; ours never needed to.
      return transactions.findByIdempotencyKey(idempotencyKey).orElseThrow(() -> raced);
    }

    List<LedgerEntry> written = new ArrayList<>(sides.size());
    for (Side side : sides) {
      written.add(LedgerEntry.of(saved.getId(), side.accountId(), side.amount()));
      // The copy on the account, in the same transaction as the entry that
      // justifies it. A statement rather than a setter, so two movements landing
      // together do not read the same stale number.
      accounts.addToBalance(side.accountId(), side.amount());
    }
    entries.saveAll(written);
    return saved;
  }

  /**
   * The account for somebody, opened the first time it is needed.
   *
   * <p>Opened rather than required, because a seller has no wallet until their first sale and
   * asking every new account to carry four empty rows is how a table fills with nothing.
   */
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

  /** What somebody holds, or zero if they have never held anything. */
  @Transactional(readOnly = true)
  public long balanceOf(AccountKind kind, UUID ownerId) {
    return accounts.findByKindAndOwnerId(kind, ownerId).map(LedgerAccount::getBalance).orElse(0L);
  }

  /**
   * Whether an account's copy still agrees with its entries.
   *
   * <p>Not called on any request path. It exists because a materialised balance is a claim, and a
   * claim nobody can check is one nobody should rely on — a scheduled job and a test both read it.
   */
  @Transactional(readOnly = true)
  public boolean isConsistent(UUID accountId) {
    LedgerAccount account = accounts.findById(accountId).orElseThrow();
    return account.getBalance() == accounts.sumEntries(accountId);
  }

  private LedgerAccount open(AccountKind kind, UUID ownerId) {
    try {
      return accounts.saveAndFlush(LedgerAccount.of(kind, ownerId));
    } catch (DataIntegrityViolationException raced) {
      // Two first sales at once. Whichever opened it, there is one.
      return accounts.findByKindAndOwnerId(kind, ownerId).orElseThrow(() -> raced);
    }
  }
}
