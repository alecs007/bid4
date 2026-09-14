package ro.bid4.backend.identity.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;

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
