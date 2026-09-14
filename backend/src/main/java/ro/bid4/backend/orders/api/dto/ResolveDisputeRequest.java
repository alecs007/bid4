package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ro.bid4.backend.orders.domain.DisputeOutcome;

public record ResolveDisputeRequest(
    @NotNull DisputeOutcome outcome, @Size(max = 1000) String note) {}
