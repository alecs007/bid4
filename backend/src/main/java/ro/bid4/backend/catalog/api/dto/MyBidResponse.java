package ro.bid4.backend.catalog.api.dto;

public record MyBidResponse(AuctionResponse auction, BidResponse myTopBid, boolean isWinning) {}
