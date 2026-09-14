package ro.bid4.backend.identity.repo;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.EmailVerificationToken;

public interface EmailVerificationTokenRepository
    extends JpaRepository<EmailVerificationToken, UUID> {
  Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

  Optional<EmailVerificationToken> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

  @Modifying
  @Query(
      "update EmailVerificationToken t set t.consumedAt = :now "
          + "where t.user.id = :userId and t.consumedAt is null")
  int consumeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
