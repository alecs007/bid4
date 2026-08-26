package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * The body of POST /auctions/{id}/bids.
 *
 * <p>Only the amount. The auction comes from the path and the bidder from the token, so a crafted
 * body cannot bid on someone else's behalf or move the offer to another listing.
 */
public record PlaceBidRequest(
    @NotNull(message = "Introdu suma pe care vrei să o oferi.")
        @Min(value = 100, message = "Oferta este prea mică.")
        // Mirrors CatalogRules.MAX_BID. Refused at the edge as well as in the
        // service, so a nonsense body is rejected before it reaches a lock.
        @Max(value = 100_000_000L, message = "Oferta depășește maximul acceptat.")
        Long amount) {}
