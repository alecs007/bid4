import { describe, expect, it } from "vitest";

import { AUCTION, bidStepFor } from "@/lib/config";
import { lei } from "@/lib/money";
import type { Auction } from "@/lib/types";
import { isLive, pickMostWatched, popularityScore } from "./featured";

/**
 * What replaced the clock.
 *
 * A listing has no deadline, so two things that used to be answered by time are now answered by
 * arithmetic: what a raise costs, and which listings lead the homepage. Both are duplicated on
 * the server — `CatalogRules.bidStepFor` and `FeaturedRanking` — and a value that appears in two
 * files eventually appears as two different values, so these pin the shape of both.
 */

function auction(over: Partial<Auction> = {}): Auction {
  return {
    id: "auc_1",
    sellerId: "usr_1",
    causeId: "cau_1",
    title: "Obiect de test",
    description: "Descriere.",
    images: [],
    category: "electronice",
    condition: "GOOD",
    weightGrams: 500,
    donationPercent: 50,
    startingPrice: lei(100),
    currentPrice: lei(100),
    bidIncrement: lei(5),
    startTime: "2026-08-01T10:00:00Z",
    status: "LIVE",
    bidCount: 0,
    watcherCount: 0,
    createdAt: "2026-08-01T10:00:00Z",
    ...over,
  };
}

describe("the bid step", () => {
  it("reads off the ladder, at the bound and just past it", () => {
    // The bounds are inclusive, which is the half of a ladder that is easy to
    // get wrong and silent when it is.
    expect(bidStepFor(lei(10))).toBe(lei(0.5));
    expect(bidStepFor(lei(10.01))).toBe(lei(2.5));
    expect(bidStepFor(lei(100))).toBe(lei(5));
    expect(bidStepFor(lei(100.01))).toBe(lei(10));
    expect(bidStepFor(lei(500))).toBe(lei(10));
    expect(bidStepFor(lei(500.01))).toBe(lei(25));
    expect(bidStepFor(lei(10_000))).toBe(lei(100));
  });

  it("falls back to the flat step above the ladder", () => {
    expect(bidStepFor(lei(10_001))).toBe(AUCTION.BID_STEP_ABOVE_LADDER);
    expect(bidStepFor(lei(1_000_000))).toBe(AUCTION.BID_STEP_ABOVE_LADDER);
  });

  it("is always a round number a person would say out loud", () => {
    // A step of 4,37 lei is arithmetically defensible and reads as a glitch.
    // Half a leu is the finest the ladder goes, so every step is a multiple.
    for (const price of [1, 37, 99, 250, 999, 4_200, 9_999, 50_000]) {
      expect(bidStepFor(lei(price)) % lei(0.5)).toBe(0);
    }
  });

  it("never asks for a raise larger than the asking price", () => {
    // The bug the bottom rungs were added for: a 1-leu listing was asking for a
    // 5-leu raise, so the second offer had to be six times the first.
    for (const price of [1, 5, 20, 100, 500, 5_000, 50_000]) {
      expect(bidStepFor(lei(price))).toBeLessThanOrEqual(lei(price));
    }
  });

  it("stays a sane share of the asking price", () => {
    // A fifth of the ask, at every rung above the floor. Below about ten lei no
    // step can be proportionate — half a leu is the smallest raise worth making,
    // and at a one-leu ask that is half of it. The rule above is what protects
    // that end: the step never exceeds the price itself.
    for (const price of [10, 25, 60, 120, 600, 1_200, 6_000, 12_000]) {
      expect(bidStepFor(lei(price)) / lei(price)).toBeLessThanOrEqual(0.2);
    }
  });
});

describe("what counts as open", () => {
  it("is the status and nothing about the time", () => {
    expect(isLive(auction({ status: "LIVE" }))).toBe(true);
    // A listing put up a year ago is still open. That is the whole change.
    expect(
      isLive(auction({ status: "LIVE", startTime: "2020-01-01T00:00:00Z" })),
    ).toBe(true);
    expect(isLive(auction({ status: "RESERVED" }))).toBe(false);
    expect(isLive(auction({ status: "SOLD" }))).toBe(false);
    expect(isLive(auction({ status: "CANCELLED" }))).toBe(false);
  });
});

describe("the homepage's first row", () => {
  it("leads with the most followed, newest breaking the tie", () => {
    const rows = pickMostWatched(
      [
        auction({ id: "a", watcherCount: 2 }),
        auction({ id: "b", watcherCount: 9 }),
        auction({
          id: "c",
          watcherCount: 9,
          createdAt: "2026-08-30T10:00:00Z",
        }),
      ],
      3,
    );

    expect(rows.map((row) => row.id)).toEqual(["c", "b", "a"]);
  });

  it("shows only what is still taking offers", () => {
    const rows = pickMostWatched([
      auction({ id: "sold", watcherCount: 99, status: "SOLD" }),
      auction({ id: "live", watcherCount: 1 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });
});

describe("popularity", () => {
  it("no longer moves with the clock", () => {
    // Two identical listings put up months apart score the same. When urgency
    // was a weight, the older one scored higher for no reason a reader could see.
    const young = auction({ createdAt: "2026-08-30T10:00:00Z" });
    const old = auction({ createdAt: "2020-01-01T00:00:00Z" });
    expect(popularityScore(young)).toBe(popularityScore(old));
  });

  it("rewards bids and watchers with diminishing returns", () => {
    const quiet = auction({ bidCount: 0, watcherCount: 0 });
    const busy = auction({ bidCount: 8, watcherCount: 8 });
    const busier = auction({ bidCount: 30, watcherCount: 30 });

    expect(popularityScore(busy)).toBeGreaterThan(popularityScore(quiet));
    // The 30th bid must not outweigh everything else.
    expect(popularityScore(busier) - popularityScore(busy)).toBeLessThan(
      popularityScore(busy) - popularityScore(quiet),
    );
  });
});
