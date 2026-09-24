import { describe, expect, it } from "vitest";

import { minimumBid, offerRefusal, suggestedOffer } from "@/lib/api/bids";
import { AUCTION } from "@/lib/config";
import { lei } from "@/lib/money";

const LISTING = {
  startingPrice: lei(100),
  currentPrice: lei(100),
  bidCount: 0,
};

const BUSY = { ...LISTING, currentPrice: lei(940), bidCount: 12 };

describe("the minimum offer", () => {
  it("is the starting price, however high the offers already are", () => {
    expect(minimumBid(LISTING)).toBe(lei(100));
    expect(minimumBid(BUSY)).toBe(lei(100));
  });
});

describe("the offer the field suggests", () => {
  it("is the starting price while nobody has offered", () => {
    expect(suggestedOffer(LISTING)).toBe(lei(100));
  });

  it("clears the highest offer by ten lei once there is one", () => {
    expect(suggestedOffer(BUSY)).toBe(lei(950));
  });
});

describe("what the form refuses", () => {
  it("refuses an empty or unreadable amount", () => {
    expect(offerRefusal(null, LISTING)).toBe("Introdu o sumă validă.");
  });

  it("refuses less than the starting price and takes the starting price", () => {
    expect(offerRefusal(lei(99), LISTING)).toContain("Minim");
    expect(offerRefusal(lei(100), LISTING)).toBeNull();
  });

  it("refuses more than a person could mean", () => {
    expect(offerRefusal(AUCTION.MAX_OFFER, LISTING)).toBeNull();
    expect(offerRefusal(AUCTION.MAX_OFFER + lei(1), LISTING)).toContain(
      "Maxim",
    );
  });

  it("asks for more than the offer the viewer already stands behind", () => {
    const mine = { ...LISTING, viewerBidAmount: lei(300) };

    expect(offerRefusal(lei(300), mine)).toContain("Mai mult");
    expect(offerRefusal(lei(250), mine)).toContain("Mai mult");
    expect(offerRefusal(lei(300.01), mine)).toBeNull();
  });

  it("lets the published price through whatever else stands", () => {
    const outright = {
      ...LISTING,
      buyNowPrice: lei(500),
      viewerBidAmount: lei(600),
    };

    expect(offerRefusal(lei(500), outright)).toBeNull();
  });
});
