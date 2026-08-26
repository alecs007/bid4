package ro.bid4.backend.cause.api.dto;

import java.util.UUID;
import ro.bid4.backend.cause.domain.CauseStatus;

/**
 * The cause as it appears inside something else — the block on an auction card, which is what makes
 * the donation visible before anyone opens the listing.
 *
 * <p>Field-for-field the {@code Pick<Cause, ...>} on AuctionDetail in
 * frontend/src/lib/types/auction.ts. The full cause, with its beneficiary and its paperwork, is a
 * different response and a different audience.
 */
public record CauseSummaryResponse(
    UUID id,
    String name,
    String slug,
    String shortDescription,
    String imageUrl,
    String category,
    long goalAmount,
    long raisedAmount,
    CauseStatus status) {}
