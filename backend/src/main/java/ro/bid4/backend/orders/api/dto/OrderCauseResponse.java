package ro.bid4.backend.orders.api.dto;

import java.util.UUID;

public record OrderCauseResponse(UUID id, String name, String slug, String imageUrl) {}
