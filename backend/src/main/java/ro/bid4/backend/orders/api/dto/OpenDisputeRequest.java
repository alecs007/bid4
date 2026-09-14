package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.Size;

public record OpenDisputeRequest(@Size(max = 1000) String reason) {}
