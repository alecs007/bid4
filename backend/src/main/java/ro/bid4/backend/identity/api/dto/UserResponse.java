package ro.bid4.backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.domain.UserStatus;

/**
 * Field-for-field the User interface in frontend/src/lib/types/user.ts.
 *
 * <p>This is the only shape of a user that ever leaves the application. passwordHash, tokenVersion,
 * failedLoginCount and lockedUntil exist on the entity and are absent here, which is the point of
 * having two types rather than serialising the entity.
 */
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
    long totalRaised) {}
