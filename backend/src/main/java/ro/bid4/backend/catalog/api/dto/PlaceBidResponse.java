package ro.bid4.backend.catalog.api.dto;

/**
 * The PlaceBidResult interface in frontend/src/lib/types/auction.ts.
 *
 * <p>{@code boughtNow} is set when the offer reached the seller's final price and took the item
 * outright. The auction in the same response comes back RESERVED — the buyer is bound to the price
 * the seller published, but nobody has paid yet — and the page has to explain that rather than
 * carry on as though an ordinary offer had been placed.
 *
 * <p>There was a third field, for how far an offer pushed the closing time out. Nothing closes on a
 * timer any more, so it could only ever have been null.
 */
public record PlaceBidResponse(BidResponse bid, AuctionResponse auction, Boolean boughtNow) {}
