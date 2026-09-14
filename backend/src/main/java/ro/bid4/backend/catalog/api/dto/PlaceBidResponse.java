package ro.bid4.backend.catalog.api.dto;

public record PlaceBidResponse(BidResponse bid, AuctionResponse auction, Boolean boughtNow) {}
