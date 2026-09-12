package ro.bid4.backend.orders.api.dto;

import jakarta.validation.constraints.Size;

/** Why a sale was called off. Optional: the thread it lands in is where the rest gets said. */
public record CancelOrderRequest(@Size(max = 500) String reason) {}
