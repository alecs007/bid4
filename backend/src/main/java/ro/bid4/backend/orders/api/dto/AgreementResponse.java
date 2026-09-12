package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import ro.bid4.backend.orders.domain.AgreementKind;

/**
 * One promise, as the order page shows it.
 *
 * <p>Carries no user id. Each party is shown what they themselves agreed to and that the other side
 * agreed to theirs; whose row it is comes from the kind, since only one of them ever makes each.
 */
public record AgreementResponse(AgreementKind kind, String termsVersion, Instant acceptedAt) {}
