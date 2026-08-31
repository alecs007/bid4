package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Which offer the seller is taking.
 *
 * <p>One field, and it is the only thing the caller gets to choose. The listing comes from the path
 * and the seller from the token, so the body cannot be edited into accepting an offer on somebody
 * else's behalf — the same reason a bid carries only its amount.
 */
public record AcceptOfferRequest(
    @NotNull(message = "Alege oferta pe care o accepți.") UUID bidId) {}
