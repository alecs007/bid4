package ro.bid4.backend.identity.repo;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

  Optional<RefreshToken> findByTokenHash(String tokenHash);

  /**
   * Revokes every live token for a user. Used on sign-out and, more importantly, when a rotated
   * token is presented again: that means a copy is loose, so the whole family is cut.
   */
  @Modifying
  @Query(
      "update RefreshToken t set t.revokedAt = :now "
          + "where t.user.id = :userId and t.revokedAt is null")
  int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
