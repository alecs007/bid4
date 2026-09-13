package ro.bid4.backend.orders.api.dto;

import java.util.List;
import java.util.UUID;

/**
 * What was sold, enough to recognise it by.
 *
 * <p>Not the full listing. An order page shows a title and a thumbnail and links to the listing for
 * the rest, and sending the whole auction — reserve included — through an order response is how a
 * seller's private figure reaches a buyer.
 */
public record OrderListingResponse(UUID id, String title, List<String> images) {}
