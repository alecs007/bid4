package ro.bid4.backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.domain.UserStatus;

public record UserResponse(
    UUID id,
    String email,
    String displayName,
    String username,
    UserRole role,
    AccountType accountType,
    UserStatus status,
    String orgLegalName,
    String orgRegistrationNumber,
    String avatarUrl,
    String bio,
    String city,
    Instant createdAt,
    boolean stripeReady,
    boolean hasPaymentMethod,
    UUID defaultDeliveryMethodId,
    double rating,
    int ratingCount,
    long totalRaised) {
  public String roleName() {
    return role.name();
  }
}
