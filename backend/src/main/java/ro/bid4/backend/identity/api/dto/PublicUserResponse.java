package ro.bid4.backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;

/**
 * What anyone may see about a user, signed in or not — the PublicUser type in
 * frontend/src/lib/types/user.ts.
 *
 * <p>Deliberately not a subset of UserResponse taken at runtime: the address, the role, the account
 * status and the payment state are absent from the shape itself, so an endpoint that returns a
 * seller alongside their listing cannot leak them by accident.
 */
public record PublicUserResponse(
    UUID id,
    String displayName,
    String username,
    AccountType accountType,
    String orgLegalName,
    String avatarUrl,
    String bio,
    String city,
    Instant createdAt,
    boolean verified,
    double rating,
    int ratingCount,
    long totalRaised) {}
