package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ro.bid4.backend.orders.domain.DisputeOutcome;

/**
 * An operator's decision on a frozen sale.
 *
 * <p>The note is what both parties are shown, so it is written for them rather than for the case
 * file — this is the one place where an internal decision becomes a sentence in somebody's inbox.
 */
public record ResolveDisputeRequest(
    @NotNull DisputeOutcome outcome, @Size(max = 1000) String note) {}
