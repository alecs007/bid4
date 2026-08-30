import type { ReactNode } from "react";
import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";
import { formatMoney, type FeeBreakdown as Breakdown } from "@/lib/money";
import { FEES } from "@/lib/config";
import { IconBubble } from "./Card";

export type FeePerspective = "BUYER" | "SELLER" | "PLATFORM" | "FULL";

function Row({
  label,
  hint,
  value,
  icon,
  tone = "default",
  strong = false,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "muted" | "positive" | "negative" | "total";
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex min-w-0 items-start gap-2">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <span
            className={cn(
              "block",
              tone === "total"
                ? "font-display text-base font-extrabold text-ink-900"
                : strong
                  ? "font-bold text-ink-900"
                  : "text-ink-700",
            )}
          >
            {label}
          </span>
          {hint ? (
            <span className="block text-xs leading-snug text-ink-500">
              {hint}
            </span>
          ) : null}
        </div>
      </div>
      <span
        className={cn(
          "numeric shrink-0 font-bold whitespace-nowrap",
          tone === "total" && "font-display text-xl text-ink-900",
          tone === "positive" && "text-success-600",
          tone === "negative" && "text-ink-700",
          tone === "muted" && "text-ink-600",
          tone === "default" && "text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const Divider = () => <hr className="my-1 border-line" />;

export function FeeBreakdown({
  breakdown,
  perspective = "BUYER",
  causeName,
  showExplainer = true,
  className,
}: {
  breakdown: Breakdown;
  perspective?: FeePerspective;
  causeName?: string;
  showExplainer?: boolean;
  className?: string;
}) {
  const {
    finalPrice,
    buyerTax,
    shipping,
    buyerTotal,
    donationPercent,
    donationAmount,
    sellerFee,
    sellerNet,
    platformRevenue,
  } = breakdown;

  const showBuyer = perspective === "BUYER" || perspective === "FULL";
  const showSeller = perspective === "SELLER" || perspective === "FULL";
  const showPlatform = perspective === "PLATFORM" || perspective === "FULL";

  return (
    <div
      className={cn(
        "rounded-3xl bg-white ring-1 ring-edge p-5",
        className,
      )}
    >
      <h3 className="mb-2 font-display text-base font-extrabold text-ink-900">
        Cum se împart banii
      </h3>
      <dl className="divide-y divide-transparent">
        <Row
          label={perspective === "SELLER" ? "Preț final adjudecat" : "Preț final"}
          value={formatMoney(finalPrice)}
          strong
        />

        {showBuyer ? (
          <>
            <Row
              label="Taxă platformă"
              hint={`${FEES.BUYER_TAX_PERCENT}% din prețul final + ${formatMoney(
                FEES.BUYER_TAX_FIXED,
                { compact: true },
              )}`}
              value={`+ ${formatMoney(buyerTax)}`}
              icon={<Icons.wallet aria-hidden="true" className="h-4 w-4 shrink-0" />}
              tone="muted"
            />
            <Row
              label="Livrare"
              hint={shipping === 0 ? "Se calculează la confirmare" : undefined}
              value={shipping === 0 ? "se adaugă la confirmare" : `+ ${formatMoney(shipping)}`}
              icon={<Icons.delivery aria-hidden="true" className="h-4 w-4 shrink-0" />}
              tone="muted"
            />
            <Divider />
            <Row
              label="Total de plată"
              value={formatMoney(buyerTotal)}
              tone="total"
            />
          </>
        ) : null}

        {showSeller ? (
          <>
            {perspective === "FULL" ? <Divider /> : null}
            <Row
              label={`Donație către cauză (${donationPercent}%)`}
              value={`− ${formatMoney(donationAmount)}`}
              icon={<Icons.donation aria-hidden="true" className="h-4 w-4 shrink-0" />}
              tone="negative"
            />
            <Row
              label={`Comision bid4 (${FEES.SELLER_FEE_PERCENT}% din partea ta)`}
              hint={
                donationPercent === 100
                  ? "Zero. Donezi integral, deci nu percepem nimic."
                  : undefined
              }
              value={sellerFee === 0 ? "0,00 lei" : `− ${formatMoney(sellerFee)}`}
              tone="negative"
            />
            <Divider />
            <Row
              label="Primești"
              value={formatMoney(sellerNet)}
              tone="total"
            />
          </>
        ) : null}

        {showPlatform ? (
          <>
            <Divider />
            <Row
              label="Venit platformă"
              hint="Taxa cumpărătorului + comisionul vânzătorului"
              value={formatMoney(platformRevenue)}
              tone="muted"
              strong
            />
          </>
        ) : null}
      </dl>
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-4">
        <IconBubble tone="primary">
          <Icons.donation aria-hidden="true" className="h-5 w-5 shrink-0" />
        </IconBubble>
        <div className="min-w-0">
          <p className="font-display font-extrabold text-ink-900">
            <span className="numeric text-primary-700">
              {formatMoney(donationAmount)}
            </span>{" "}
            merg către {causeName ?? "cauza aleasă"}
          </p>
          <p className="text-xs text-ink-500">
            {donationPercent}% din prețul final, transferat după livrare.
          </p>
        </div>
      </div>

      {showExplainer ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <Icons.info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Banii sunt păstrați de bid4 până confirmi că ai primit produsul. Abia
          apoi donația pleacă spre cauză, iar vânzătorul își primește partea.
        </p>
      ) : null}
    </div>
  );
}
