package ro.bid4.backend.identity.repo;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.UserAccount;

public interface UserAccountRepository
    extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {
  Optional<UserAccount> findByEmail(String email);

  Optional<UserAccount> findByUsername(String username);

  boolean existsByEmail(String email);

  boolean existsByUsername(String username);

  @Query(
      value = "select exists(select 1 from payment_methods where user_id = :userId)",
      nativeQuery = true)
  boolean hasPaymentMethod(@Param("userId") UUID userId);

  @Query("select u.tokenVersion from UserAccount u where u.id = :userId")
  Optional<Integer> findTokenVersionById(@Param("userId") UUID userId);
}
