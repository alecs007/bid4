import { describe, expect, it } from "vitest";

import { lei } from "@/lib/money";
import type { Auction } from "@/lib/types";
import { isLive, pickLatest, pickMostWatched, popularityScore } from "./featured";

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
    startTime: "2026-08-01T10:00:00Z",
    status: "LIVE",
    bidCount: 0,
    watcherCount: 0,
    createdAt: "2026-08-01T10:00:00Z",
    ...over,
  };
}

describe("what counts as open", () => {
  it("is the status and nothing about the time", () => {
    expect(isLive(auction({ status: "LIVE" }))).toBe(true);
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

describe("the homepage's second row", () => {
  it("is newest first, by when the listing went up", () => {
    const rows = pickLatest(
      [
        auction({ id: "old", startTime: "2026-08-01T10:00:00Z" }),
        auction({ id: "newest", startTime: "2026-08-30T10:00:00Z" }),
        auction({ id: "middle", startTime: "2026-08-15T10:00:00Z" }),
      ],
      3,
    );

    expect(rows.map((row) => row.id)).toEqual(["newest", "middle", "old"]);
  });

  it("keeps every listing a seller put up, unlike the row it replaced", () => {
    const rows = pickLatest(
      [
        auction({ id: "first", sellerId: "same", startTime: "2026-08-30T10:00:00Z" }),
        auction({ id: "second", sellerId: "same", startTime: "2026-08-29T10:00:00Z" }),
      ],
      8,
    );

    expect(rows.map((row) => row.id)).toEqual(["first", "second"]);
  });

  it("shows only what is still taking offers", () => {
    const rows = pickLatest([
      auction({ id: "sold", status: "SOLD", startTime: "2026-09-01T10:00:00Z" }),
      auction({ id: "live", startTime: "2026-08-01T10:00:00Z" }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });
});

describe("popularity", () => {
  it("no longer moves with the clock", () => {
    const young = auction({ createdAt: "2026-08-30T10:00:00Z" });
    const old = auction({ createdAt: "2020-01-01T00:00:00Z" });
    expect(popularityScore(young)).toBe(popularityScore(old));
  });

  it("rewards bids and watchers with diminishing returns", () => {
    const quiet = auction({ bidCount: 0, watcherCount: 0 });
    const busy = auction({ bidCount: 8, watcherCount: 8 });
    const busier = auction({ bidCount: 30, watcherCount: 30 });

    expect(popularityScore(busy)).toBeGreaterThan(popularityScore(quiet));
    expect(popularityScore(busier) - popularityScore(busy)).toBeLessThan(
      popularityScore(busy) - popularityScore(quiet),
    );
  });
});
