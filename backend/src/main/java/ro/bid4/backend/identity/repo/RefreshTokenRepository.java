package ro.bid4.backend.identity.repo;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

  Optional<RefreshToken> findByTokenHash(String tokenHash);

  /**
   * The same lookup, holding a row lock until the transaction ends.
   *
   * <p>Exchanging a token is read-check-write: is it spent, and if not, spend it. Without the lock
   * two concurrent presentations of one token both read "not spent" and both succeed, which forks
   * the session into two live chains and leaves reuse detection blind to the very thing it exists
   * to catch. Postgres serialises them here instead, so the second caller reads what the first
   * wrote and is judged on it.
   *
   * <p>Only presentations of the same token contend; the lock is per row.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from RefreshToken t where t.tokenHash = :hash")
  Optional<RefreshToken> findByTokenHashForUpdate(@Param("hash") String hash);

  /**
   * Revokes every live token for a user. Used on sign-out and, more importantly, when a rotated
   * token is presented again: that means a copy is loose, so the whole family is cut.
   */
  @Modifying
  @Query(
      "update RefreshToken t set t.revokedAt = :now "
          + "where t.user.id = :userId and t.revokedAt is null")
  int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);

  /**
   * Deletes rows whose token expired before the cutoff, revoked or not.
   *
   * <p>Ancestors always expire before their successors, so a chain is removed oldest first and
   * rotated_to is never left dangling by this.
   */
  @Modifying(flushAutomatically = true)
  @Query("delete from RefreshToken t where t.expiresAt < :cutoff")
  int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
