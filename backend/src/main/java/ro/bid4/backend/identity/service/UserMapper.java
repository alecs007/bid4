package ro.bid4.backend.identity.service;

import org.springframework.stereotype.Component;
import ro.bid4.backend.identity.api.dto.UserResponse;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * The one place an entity becomes a response.
 *
 * <p>Written by hand rather than generated. At this size a mapper you can step into is worth more
 * than one you have to trust, and it keeps a second annotation processor out of the build.
 */
@Component
public class UserMapper {

  private final UserAccountRepository users;

  public UserMapper(UserAccountRepository users) {
    this.users = users;
  }

  public UserResponse toResponse(UserAccount user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getDisplayName(),
        user.getUsername(),
        user.getRole(),
        user.getAccountType(),
        user.getStatus(),
        user.getOrgLegalName(),
        user.getOrgRegistrationNumber(),
        user.getAvatarUrl(),
        user.getBio(),
        user.getCity(),
        user.getCreatedAt(),
        user.isStripeReady(),
        users.hasPaymentMethod(user.getId()),
        user.getDefaultDeliveryMethodId(),
        user.getRating().doubleValue(),
        user.getRatingCount(),
        user.getTotalRaised());
  }
}
