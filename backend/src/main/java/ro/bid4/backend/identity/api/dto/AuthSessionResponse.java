package ro.bid4.backend.identity.api.dto;

import java.time.Instant;

public record AuthSessionResponse(UserResponse user, String token, Instant expiresAt) {}
