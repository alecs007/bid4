package ro.bid4.backend.identity.service;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Component;
import ro.bid4.backend.identity.api.dto.PublicUserResponse;
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
        avatarUrl(user),
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

  /**
   * What travels beside someone else's content — a seller on a listing, an organiser on a cause.
   */
  public PublicUserResponse toPublicUser(UserAccount user) {
    return new PublicUserResponse(
        user.getId(),
        user.getDisplayName(),
        user.getUsername(),
        user.getAccountType(),
        user.getOrgLegalName(),
        avatarUrl(user),
        user.getBio(),
        user.getCity(),
        user.getCreatedAt(),
        user.getRating().doubleValue(),
        user.getRatingCount(),
        user.getTotalRaised());
  }

  /**
   * Never null on the wire.
   *
   * <p>avatarUrl is a required string in frontend/src/lib/types/user.ts, and the column is nullable
   * because "no avatar chosen" is a real state. Left as null it is dropped by non_null inclusion,
   * and the frontend then holds a declared string that is undefined at runtime.
   */
  private static String avatarUrl(UserAccount user) {
    return user.getAvatarUrl() == null ? "" : user.getAvatarUrl();
  }

  /**
   * A whole page's worth of sellers in one query.
   *
   * <p>Fetching them one at a time is how a page of twelve cards becomes thirteen round trips.
   */
  public Map<UUID, PublicUserResponse> publicUsersById(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    return StreamSupport.stream(users.findAllById(ids).spliterator(), false)
        .collect(
            Collectors.toMap(UserAccount::getId, this::toPublicUser, (first, second) -> first));
  }
}
