import { FEES, LEU, type Bani } from "@/lib/config";

export function lei(amount: number): Bani {
  return Math.round(amount * LEU);
}

export function toLei(amount: Bani): number {
  return amount / LEU;
}

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
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
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
  compact?: boolean;
  omitCurrency?: boolean;
  signed?: boolean;
}

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

export function percentOf(amount: Bani, percent: number): Bani {
  return Math.round((amount * percent) / 100);
}

export function sumMoney(...amounts: Bani[]): Bani {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function progressPercent(raised: Bani, goal: Bani): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (raised / goal) * 100));
}

export interface FeeBreakdown {
  finalPrice: Bani;
  buyerTax: Bani;
  shipping: Bani;
  buyerTotal: Bani;

  donationPercent: number;
  donationAmount: Bani;
  sellerShare: Bani;

  platformRevenue: Bani;
}

export interface ComputeFeesInput {
  finalPrice: Bani;
  donationPercent: number;
  shipping?: Bani;
}

export function computeFees({
  finalPrice,
  donationPercent,
  shipping = 0,
}: ComputeFeesInput): FeeBreakdown {
  const safePercent = Math.min(100, Math.max(0, donationPercent));

  const buyerTax =
    percentOf(finalPrice, FEES.BUYER_TAX_PERCENT) + FEES.BUYER_TAX_FIXED;

  const donationAmount = percentOf(finalPrice, safePercent);

  return {
    finalPrice,
    buyerTax,
    shipping,
    buyerTotal: finalPrice + buyerTax + shipping,
    donationPercent: safePercent,
    donationAmount,
    sellerShare: finalPrice - donationAmount,
    platformRevenue: buyerTax,
  };
}
