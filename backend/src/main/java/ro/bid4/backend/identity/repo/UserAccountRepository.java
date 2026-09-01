package ro.bid4.backend.identity.repo;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.identity.domain.UserAccount;

/**
 * Spring Data derives the SQL from the method name and always binds parameters, which is why no
 * query in this project concatenates user input into a statement.
 */
public interface UserAccountRepository
    extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {

  Optional<UserAccount> findByEmail(String email);

  Optional<UserAccount> findByUsername(String username);

  boolean existsByEmail(String email);

  boolean existsByUsername(String username);

  /**
   * Half of the gate that unlocks bidding. A native EXISTS rather than an entity we do not
   * otherwise need yet; the parameter is still bound, so it is no more injectable than derived SQL.
   */
  @Query(
      value = "select exists(select 1 from payment_methods where user_id = :userId)",
      nativeQuery = true)
  boolean hasPaymentMethod(@Param("userId") UUID userId);

  /**
   * The token version alone, checked on every authenticated request.
   *
   * <p>One column rather than the entity: this runs in the security filter chain, and loading a
   * whole user with its associations to compare one integer is the difference between a cheap
   * revocation check and a reason to skip having one.
   */
  @Query("select u.tokenVersion from UserAccount u where u.id = :userId")
  Optional<Integer> findTokenVersionById(@Param("userId") UUID userId);
}
