package ro.bid4.backend.orders.api.dto;

import java.util.UUID;
import ro.bid4.backend.identity.domain.AccountType;

/**
 * One side of a sale, as the other side may see them.
 *
 * <p>A deliberate subset of the public profile: enough to show a face and a name and to link to the
 * profile, and nothing else. An order is read by the party opposite, so anything here is something
 * that party is entitled to know — which is why there is no email and no city.
 */
public record OrderPartyResponse(
    UUID id,
    String displayName,
    String username,
    String avatarUrl,
    AccountType accountType,
    boolean verified) {}
