package ro.bid4.backend.ledger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.domain.LedgerTransaction;
import ro.bid4.backend.ledger.domain.TransactionKind;
import ro.bid4.backend.ledger.repo.LedgerEntryRepository;
import ro.bid4.backend.ledger.service.LedgerService;
import ro.bid4.backend.ledger.service.LedgerService.Side;

@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "bid4.rate-limit.enabled=false")
class LedgerTest {
  @Autowired private LedgerService ledger;
  @Autowired private LedgerEntryRepository entries;

  @Test
  @DisplayName("a movement adds to zero, and both sides land")
  void movementsBalance() {
    UUID escrow = ledger.platform(AccountKind.PLATFORM_ESCROW).getId();
    UUID external = ledger.platform(AccountKind.EXTERNAL).getId();
    long before = ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance();

    ledger.post(
        TransactionKind.PAYMENT,
        key(),
        null,
        "test",
        List.of(new Side(external, -5_000), new Side(escrow, 5_000)));

    assertThat(ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance()).isEqualTo(before + 5_000);
    assertThat(ledger.isConsistent(escrow)).isTrue();
    assertThat(ledger.isConsistent(external)).isTrue();
  }

  @Test
  @DisplayName("a movement that does not add to zero is refused before it is written")
  void unbalancedMovementsAreRefused() {
    UUID escrow = ledger.platform(AccountKind.PLATFORM_ESCROW).getId();
    UUID external = ledger.platform(AccountKind.EXTERNAL).getId();

    assertThatThrownBy(
            () ->
                ledger.post(
                    TransactionKind.ADJUSTMENT,
                    key(),
                    null,
                    "crooked",
                    List.of(new Side(external, -5_000), new Side(escrow, 4_000))))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("does not balance");
  }

  @Test
  @DisplayName("the same key twice moves the money once")
  void postingIsIdempotent() {
    UUID escrow = ledger.platform(AccountKind.PLATFORM_ESCROW).getId();
    UUID external = ledger.platform(AccountKind.EXTERNAL).getId();
    long before = ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance();
    String once = key();

    LedgerTransaction first =
        ledger.post(
            TransactionKind.PAYMENT,
            once,
            null,
            "webhook",
            List.of(new Side(external, -1_000), new Side(escrow, 1_000)));
    LedgerTransaction again =
        ledger.post(
            TransactionKind.PAYMENT,
            once,
            null,
            "webhook",
            List.of(new Side(external, -1_000), new Side(escrow, 1_000)));

    assertThat(again.getId()).isEqualTo(first.getId());
    assertThat(ledger.platform(AccountKind.PLATFORM_ESCROW).getBalance()).isEqualTo(before + 1_000);
    assertThat(entries.findByTransactionId(first.getId())).hasSize(2);
  }

  @Test
  @DisplayName("nobody's own money can be paid out twice")
  void ownedAccountsCannotBeOverdrawn() {
    UUID seller = UUID.randomUUID();
    UUID wallet = ledger.accountFor(AccountKind.USER_AVAILABLE, seller).getId();
    UUID external = ledger.platform(AccountKind.EXTERNAL).getId();

    ledger.post(
        TransactionKind.RELEASE,
        key(),
        null,
        "earned",
        List.of(new Side(external, -2_000), new Side(wallet, 2_000)));

    assertThatThrownBy(
            () ->
                ledger.post(
                    TransactionKind.PAYOUT,
                    key(),
                    null,
                    "too much",
                    List.of(new Side(wallet, -3_000), new Side(external, 3_000))))
        .isInstanceOf(Exception.class);
  }

  @Test
  @DisplayName("an entry cannot be edited or removed once it is written")
  void entriesAreFinal() {
    UUID escrow = ledger.platform(AccountKind.PLATFORM_ESCROW).getId();
    UUID external = ledger.platform(AccountKind.EXTERNAL).getId();

    LedgerTransaction posted =
        ledger.post(
            TransactionKind.PAYMENT,
            key(),
            null,
            "final",
            List.of(new Side(external, -700), new Side(escrow, 700)));

    assertThatThrownBy(() -> entries.deleteAll(entries.findByTransactionId(posted.getId())))
        .isInstanceOf(Exception.class);
  }

  @Test
  @DisplayName("a wallet opens itself the first time somebody is owed anything")
  void walletsOpenOnDemand() {
    UUID newcomer = UUID.randomUUID();

    assertThat(ledger.balanceOf(AccountKind.USER_AVAILABLE, newcomer)).isZero();
    assertThat(ledger.accountFor(AccountKind.USER_AVAILABLE, newcomer).getId()).isNotNull();
    assertThat(ledger.accountFor(AccountKind.USER_AVAILABLE, newcomer).getId())
        .isEqualTo(ledger.accountFor(AccountKind.USER_AVAILABLE, newcomer).getId());
  }

  private static String key() {
    return "test:" + UUID.randomUUID();
  }
}
