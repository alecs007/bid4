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
        user.isVerified(),
        user.getRating().doubleValue(),
        user.getRatingCount(),
        user.getTotalRaised());
  }

  private static String avatarUrl(UserAccount user) {
    return user.getAvatarUrl() == null ? "" : user.getAvatarUrl();
  }

  public Map<UUID, PublicUserResponse> publicUsersById(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    return StreamSupport.stream(users.findAllById(ids).spliterator(), false)
        .collect(
            Collectors.toMap(UserAccount::getId, this::toPublicUser, (first, second) -> first));
  }
}
