package ro.bid4.backend.orders.api.dto;

import java.time.Instant;
import java.util.UUID;
import ro.bid4.backend.orders.domain.OrderStatus;

public record TrackingEventResponse(
    UUID id, OrderStatus status, String label, String location, Instant at) {}
