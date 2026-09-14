package ro.bid4.backend.identity.repo;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.identity.domain.OAuthIdentity;
import ro.bid4.backend.identity.domain.OAuthProvider;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, UUID> {
  Optional<OAuthIdentity> findByProviderAndProviderUserId(
      OAuthProvider provider, String providerUserId);
}
