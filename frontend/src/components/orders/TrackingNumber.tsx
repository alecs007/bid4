"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import { SHIPPING } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

function CourierMark({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/couriers/sameday.webp"
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      onError={() => setFailed(true)}
      className={cn("h-4 w-4 shrink-0 object-contain", className)}
    />
  );
}

export function TrackingNumber({
  awb,
  viewerIsBuyer,
  className,
}: {
  awb: string;
  viewerIsBuyer: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const CopyIcon = copied ? Icons.check : Icons.copy;

  return (
    <div
      className={cn(
        "flex w-full max-w-xs flex-col gap-1.5 rounded-2xl bg-white p-3 text-left ring-1 ring-edge",
        className,
      )}
    >
      <p className="text-[11px] font-bold text-ink-500">
        Număr de urmărire a coletului (AWB)
      </p>

      <div className="flex items-center gap-1">
        <span className="numeric min-w-0 truncate text-[14px] font-extrabold text-ink-900">
          {awb}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(awb).then(() => setCopied(true));
          }}
          title={copied ? "Copiat" : "Copiază numărul"}
          aria-label="Copiază numărul de urmărire"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <CopyIcon
            aria-hidden="true"
            className={cn("h-3.5 w-3.5 shrink-0", copied && "text-primary-700")}
          />
        </button>
      </div>

      {viewerIsBuyer ? (
        <a
          href={`${SHIPPING.TRACKING_URL_BASE}/${awb}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center justify-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-[13px] font-bold text-ink-800 transition hover:bg-ink-100"
        >
          <CourierMark />
          Urmărește coletul pe {SHIPPING.COURIER_NAME}
          <Icons.forward aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400" />
        </a>
      ) : (
        <p className="text-[11px] leading-snug text-ink-500">
          Numărul este tipărit pe eticheta de expediere și identifică coletul la
          curier.
        </p>
      )}
    </div>
  );
}
