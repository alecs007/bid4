package ro.bid4.backend.orders.api.dto;

import java.util.UUID;

/**
 * The cause the donation goes to.
 *
 * <p>Named rather than referenced, because every screen that mentions the donation names the cause
 * — a rule that cost a round of corrections — and a page holding only a causeId cannot.
 */
public record OrderCauseResponse(UUID id, String name, String slug, String imageUrl) {}
