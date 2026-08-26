/**
 * Every amount is an INTEGER number of bani. Floats never touch money: they turn
 * into a 1-ban mismatch between the buyer's total and the seller payout. The
 * backend serialises the same way, so DTOs map across without a conversion.
 */

import { FEES, LEU, type Bani } from "@/lib/config";

/** `lei(12.5)` → 1250 bani. Rounds half-up at the ban. */
export function lei(amount: number): Bani {
  return Math.round(amount * LEU);
}

/** 1250 bani → 12.5. Only for charts/inputs, never for arithmetic. */
export function toLei(amount: Bani): number {
  return amount / LEU;
}

/**
 * Accepts "1.250,50", "1250,50", "1250.50", "1 250,50 lei". Returns null when the
 * text is not a usable amount, so callers can show a field error.
 */
export function parseLeiInput(raw: string): Bani | null {
  const cleaned = raw
    .replace(/lei|ron/gi, "")
    .replace(/\s| /g, "")
    .trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalised: string;

  if (lastComma > lastDot) {
    // Romanian: dots group thousands, comma is the decimal separator.
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // "25.000" is how ro-RO prints twenty-five thousand: dots in pure
    // three-digit groups group, anything else is a decimal point.
    normalised = /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, "")
      : cleaned.replace(/,/g, "");
  } else {
    normalised = cleaned;
  }

  if (!/^\d+(\.\d+)?$/.test(normalised)) return null;
  const value = Number.parseFloat(normalised);
  if (!Number.isFinite(value) || value < 0) return null;
  return lei(value);
}

const roFormatter = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const roWholeFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
});

export interface FormatMoneyOptions {
  /** Drop ",00" on round amounts — nicer in dense card UI. Default false. */
  compact?: boolean;
  /** Omit the " lei" suffix (when a column header already says it). */
  omitCurrency?: boolean;
  /** Force a leading "+" / "−" (used in the money-split breakdown). */
  signed?: boolean;
}

/** 125_000 → "1.250,00 lei" */
export function formatMoney(
  amount: Bani,
  options: FormatMoneyOptions = {},
): string {
  const { compact = false, omitCurrency = false, signed = false } = options;
  const isNegative = amount < 0;
  const absolute = Math.abs(amount);
  const useWhole = compact && absolute % LEU === 0;
  const body = useWhole
    ? roWholeFormatter.format(absolute / LEU)
    : roFormatter.format(absolute / LEU);

  const sign = isNegative ? "−" : signed ? "+" : "";
  return `${sign}${body}${omitCurrency ? "" : " lei"}`;
}

/** Short form for big impact numbers: 1_234_500 bani → "12,3 mii lei". */
export function formatMoneyShort(amount: Bani): string {
  const value = toLei(amount);
  if (value >= 1_000_000) {
    return `${roFormatter
      .format(value / 1_000_000)
      .replace(/,00$/, "")} mil. lei`;
  }
  if (value >= 10_000) {
    return `${new Intl.NumberFormat("ro-RO", {
      maximumFractionDigits: 1,
    }).format(value / 1000)} mii lei`;
  }
  return formatMoney(amount, { compact: true });
}

export function formatPercent(percent: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(
    percent,
  )}%`;
}

/** Exact percentage of an integer amount, rounded half-up to the ban. */
export function percentOf(amount: Bani, percent: number): Bani {
  return Math.round((amount * percent) / 100);
}

export function clampMoney(amount: Bani, min: Bani, max: Bani): Bani {
  return Math.min(Math.max(amount, min), max);
}

export function sumMoney(...amounts: Bani[]): Bani {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/** Progress toward a goal, clamped to 0–100 and safe when goal is 0. */
export function progressPercent(raised: Bani, goal: Bani): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (raised / goal) * 100));
}

export interface FeeBreakdown {
  /** Hammer price — what the winning bid was. */
  finalPrice: Bani;
  /** Buyer-side platform tax: 5% clamped to [5, 50] lei. */
  buyerTax: Bani;
  /** Delivery cost, paid by the buyer on top. */
  shipping: Bani;
  /** What the buyer is actually charged. */
  buyerTotal: Bani;

  donationPercent: number;
  /** Goes to the cause on release. */
  donationAmount: Bani;
  /** finalPrice − donationAmount. */
  sellerShare: Bani;
  /** 2% of the seller's share — exactly 0 when donating 100%. */
  sellerFee: Bani;
  /** What the seller receives on release. */
  sellerNet: Bani;

  /** buyerTax + sellerFee. */
  platformRevenue: Bani;
}

export interface ComputeFeesInput {
  finalPrice: Bani;
  donationPercent: number;
  /** Defaults to 0 — the auction page previews fees before delivery is known. */
  shipping?: Bani;
}

/** Identical to the backend's FeeService. */
export function computeFees({
  finalPrice,
  donationPercent,
  shipping = 0,
}: ComputeFeesInput): FeeBreakdown {
  const safePercent = Math.min(100, Math.max(0, donationPercent));

  const buyerTax = clampMoney(
    percentOf(finalPrice, FEES.BUYER_TAX_PERCENT),
    FEES.BUYER_TAX_MIN,
    FEES.BUYER_TAX_MAX,
  );

  const donationAmount = percentOf(finalPrice, safePercent);
  const sellerShare = finalPrice - donationAmount;
  const sellerFee = percentOf(sellerShare, FEES.SELLER_FEE_PERCENT);
  const sellerNet = sellerShare - sellerFee;

  return {
    finalPrice,
    buyerTax,
    shipping,
    buyerTotal: finalPrice + buyerTax + shipping,
    donationPercent: safePercent,
    donationAmount,
    sellerShare,
    sellerFee,
    sellerNet,
    platformRevenue: buyerTax + sellerFee,
  };
}
