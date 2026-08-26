package ro.bid4.backend.catalog.api.dto;

/**
 * The PlaceBidResult interface in frontend/src/lib/types/auction.ts.
 *
 * <p>{@code extendedBySeconds} is set when the offer landed inside the anti-snipe window and pushed
 * the close out, so the page can say so rather than leaving the clock to jump on its own.
 *
 * <p>{@code boughtNow} is set when the offer reached the seller's final price and took the item
 * outright. The auction in the same response is already SOLD, and the page has to explain that
 * rather than carry on counting down.
 */
public record PlaceBidResponse(
    BidResponse bid, AuctionResponse auction, Integer extendedBySeconds, Boolean boughtNow) {}
