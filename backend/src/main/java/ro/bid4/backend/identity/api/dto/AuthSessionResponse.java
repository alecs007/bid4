package ro.bid4.backend.identity.api.dto;

import java.time.Instant;

/**
 * The AuthSession interface in frontend/src/lib/types/user.ts.
 *
 * <p>{@code token} is the short-lived access token the frontend puts in the Authorization header.
 * The refresh token is deliberately not here — it travels in an httpOnly cookie, where a script
 * that manages to run on the page cannot read it.
 */
public record AuthSessionResponse(UserResponse user, String token, Instant expiresAt) {}
