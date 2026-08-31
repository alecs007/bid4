import { describe, expect, it } from "vitest";

import { FEES } from "@/lib/config";
import {
  computeFees,
  formatMoney,
  lei,
  parseLeiInput,
  percentOf,
  progressPercent,
  sumMoney,
  toLei,
} from "./money";

/**
 * Money is held in whole bani and never in a floating point type, so the tests
 * that matter are the ones that would catch it drifting: a value that survives a
 * round trip, a percentage that rounds rather than truncates, and a total that
 * still adds up after the split.
 */
describe("bani and lei", () => {
  it("converts without losing anything on the way back", () => {
    expect(lei(1)).toBe(100);
    expect(lei(12.5)).toBe(1250);
    expect(toLei(lei(1234.56))).toBeCloseTo(1234.56, 2);
  });

  it("keeps whole bani rather than a fraction of one", () => {
    expect(Number.isInteger(lei(0.1) + lei(0.2))).toBe(true);
    expect(lei(0.1) + lei(0.2)).toBe(lei(0.3));
  });
});

describe("parseLeiInput", () => {
  it("reads what a Romanian keyboard produces", () => {
    expect(parseLeiInput("12,50")).toBe(1250);
    expect(parseLeiInput("1.000")).toBe(100_000);
    expect(parseLeiInput("25.000,99")).toBe(2_500_099);
  });

  it("tolerates the currency being typed out", () => {
    expect(parseLeiInput("500 lei")).toBe(50_000);
    expect(parseLeiInput("500 RON")).toBe(50_000);
    expect(parseLeiInput("  500  ")).toBe(50_000);
  });

  it("returns null rather than a wrong number", () => {
    expect(parseLeiInput("")).toBeNull();
    expect(parseLeiInput("   ")).toBeNull();
    expect(parseLeiInput("lei")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("prints two decimals by default and drops them when asked and round", () => {
    expect(formatMoney(100_000)).toBe("1.000,00 lei");
    expect(formatMoney(100_000, { compact: true })).toBe("1.000 lei");
    // compact only drops a decimal that is actually zero
    expect(formatMoney(250, { compact: true })).toBe("2,50 lei");
  });

  it("can leave the currency to a column header", () => {
    expect(formatMoney(100_000, { compact: true, omitCurrency: true })).toBe("1.000");
  });
});

describe("percentOf", () => {
  it("rounds to the nearest ban rather than truncating", () => {
    expect(percentOf(1000, 50)).toBe(500);
    // 33% of 10,01 lei is 330,33 bani; a truncation would lose the third
    expect(percentOf(1001, 33)).toBe(330);
    expect(percentOf(333, 50)).toBe(167);
  });

  it("is exact at the ends", () => {
    expect(percentOf(12_345, 0)).toBe(0);
    expect(percentOf(12_345, 100)).toBe(12_345);
  });
});

describe("progressPercent", () => {
  it("clamps rather than reporting more than a full bar", () => {
    expect(progressPercent(50, 100)).toBe(50);
    expect(progressPercent(300, 100)).toBe(100);
    expect(progressPercent(-10, 100)).toBe(0);
  });

  it("survives a goal of zero instead of dividing by it", () => {
    expect(progressPercent(500, 0)).toBe(0);
  });
});

/**
 * The split, which is the arithmetic the platform is actually judged on: the
 * buyer's total, the cause's share and what reaches the seller have to add up
 * against the hammer price every time.
 */
describe("computeFees", () => {
  const finalPrice = lei(1000);

  it("charges a percentage plus the fixed part, with no floor or ceiling", () => {
    const cheap = computeFees({ finalPrice: lei(20), donationPercent: 50 });
    expect(cheap.buyerTax).toBe(
      percentOf(lei(20), FEES.BUYER_TAX_PERCENT) + FEES.BUYER_TAX_FIXED,
    );

    // The old clamp made a 20-lei item pay 5 lei, which is 25% under a 5% label.
    expect(cheap.buyerTax).toBeLessThan(lei(5));
  });

  it("scales with the price rather than stopping at a cap", () => {
    const dear = computeFees({ finalPrice: lei(5000), donationPercent: 10 });
    expect(dear.buyerTax).toBe(
      percentOf(lei(5000), FEES.BUYER_TAX_PERCENT) + FEES.BUYER_TAX_FIXED,
    );
    expect(dear.buyerTax).toBeGreaterThan(lei(50));
  });

  it("adds up: the buyer pays the price, the tax and the delivery", () => {
    const shipping = lei(14.99);
    const fees = computeFees({ finalPrice, donationPercent: 75, shipping });
    expect(fees.buyerTotal).toBe(finalPrice + fees.buyerTax + shipping);
  });

  it("adds up: the donation and the seller's side account for the price", () => {
    const fees = computeFees({ finalPrice, donationPercent: 75 });
    expect(fees.donationAmount + fees.sellerShare).toBe(finalPrice);
    expect(fees.sellerNet + fees.sellerFee).toBe(fees.sellerShare);
  });

  it("costs the seller nothing to give everything away", () => {
    const fees = computeFees({ finalPrice, donationPercent: 100 });
    expect(fees.donationAmount).toBe(finalPrice);
    expect(fees.sellerShare).toBe(0);
    expect(fees.sellerFee).toBe(0);
    expect(fees.sellerNet).toBe(0);
  });

  it("holds a donation percentage inside 0–100 however it is called", () => {
    expect(computeFees({ finalPrice, donationPercent: 150 }).donationPercent).toBe(100);
    expect(computeFees({ finalPrice, donationPercent: -10 }).donationPercent).toBe(0);
  });

  it("counts the platform's own take as the two fees it charged", () => {
    const fees = computeFees({ finalPrice, donationPercent: 40 });
    expect(fees.platformRevenue).toBe(fees.buyerTax + fees.sellerFee);
  });
});

describe("sumMoney", () => {
  it("adds nothing to zero", () => {
    expect(sumMoney()).toBe(0);
    expect(sumMoney(lei(1), lei(2), lei(3))).toBe(lei(6));
  });
});
