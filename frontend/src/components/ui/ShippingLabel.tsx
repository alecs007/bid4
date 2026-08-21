"use client";

import { useRef, useState, type RefObject } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";
import { formatDateTimeRo } from "@/lib/utils/date";
import { downloadShippingLabel } from "@/lib/pdf/shippingLabel";
import type { ShippingLabelData } from "@/lib/types";
import { Button } from "./Button";
import { LogoMark } from "./Logo";

/**
 * The Vinted-style parcel label, drawn at 100 x 150 mm (378 x 567 px @96dpi)
 * so what the seller sees on screen is exactly what `lib/pdf/shippingLabel.ts`
 * prints. Keep the two in sync: this component is the reference layout.
 *
 * TODO(backend): the real label PDF and AWB come from the Sameday Easybox API
 * (see lib/api/shipping.ts). This local renderer stays as the fallback preview.
 */
export const LABEL_WIDTH_PX = 378;
export const LABEL_HEIGHT_PX = 567;

function Block({
  caption,
  children,
  className,
}: {
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-0.5 text-[8px] font-bold tracking-[0.08em] text-black/50">
        {caption}
      </p>
      <div className="text-[10px] leading-[1.35] text-black">{children}</div>
    </div>
  );
}

export function ShippingLabel({
  data,
  qrRef,
  className,
}: {
  data: ShippingLabelData;
  /** Lets the PDF exporter grab the rendered QR as a PNG. */
  qrRef?: RefObject<HTMLCanvasElement | null>;
  className?: string;
}) {
  const isEasybox = data.deliveryType === "EASYBOX";
  const weightKg = (data.weightGrams / 1000).toFixed(2).replace(".", ",");

  return (
    <div
      className={cn(
        "flex flex-col bg-white font-sans text-black ring-1 ring-ink-200",
        className,
      )}
      style={{ width: LABEL_WIDTH_PX, height: LABEL_HEIGHT_PX }}
    >
      {/* Header ------------------------------------------------------------ */}
      <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="font-display text-xl leading-none font-extrabold">
            bid4
          </span>
        </div>
        <div className="text-right">
          <p className="text-[13px] leading-none font-extrabold">
            {data.serviceName}
          </p>
          <p className="mt-1 text-[9px] text-black/60">
            {formatDateTimeRo(data.issuedAt)}
          </p>
        </div>
      </div>

      {/* Destination headline ---------------------------------------------- */}
      <div className="border-b border-dashed border-black/40 px-4 py-3">
        <p className="text-[8px] font-bold tracking-[0.08em] text-black/50">
          {isEasybox ? "Easybox destinație" : "Livrare la adresă"}
        </p>
        {isEasybox ? (
          <>
            <p className="font-mono text-[30px] leading-none font-black tracking-tight">
              {data.lockerId}
            </p>
            <p className="mt-1 truncate text-[11px] font-bold">
              {data.lockerName}
            </p>
          </>
        ) : (
          <p className="mt-1 font-display text-[20px] leading-tight font-extrabold">
            {data.recipient.name}
          </p>
        )}
      </div>

      {/* Recipient + QR ----------------------------------------------------- */}
      <div className="flex gap-3 border-b border-dashed border-black/40 px-4 py-3">
        <Block caption="Destinatar" className="flex-1">
          <p className="font-bold">{data.recipient.name}</p>
          {data.recipient.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="mt-0.5 font-mono">{data.recipient.phone}</p>
        </Block>

        <div className="flex shrink-0 flex-col items-center">
          <QRCodeCanvas
            ref={qrRef}
            value={data.qrPayload}
            size={104}
            level="M"
            marginSize={0}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
          <p className="mt-1 text-[7px] text-black/50">Scanează la locker</p>
        </div>
      </div>

      {/* AWB ---------------------------------------------------------------- */}
      <div className="border-b-2 border-black bg-black/[0.04] px-4 py-2.5 text-center">
        <p className="text-[8px] font-bold tracking-[0.08em] text-black/50">Cod AWB</p>
        <p className="font-mono text-[19px] leading-tight font-black tracking-[0.06em]">
          {data.awb}
        </p>
      </div>

      {/* Sender -------------------------------------------------------------- */}
      <div className="border-b border-dashed border-black/40 px-4 py-3">
        <Block caption="Expeditor">
          <p className="font-bold">{data.sender.name}</p>
          {data.sender.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="mt-0.5 font-mono">{data.sender.phone}</p>
        </Block>
      </div>

      {/* Parcel details ------------------------------------------------------ */}
      <div className="grid grid-cols-3 gap-2 border-b border-dashed border-black/40 px-4 py-3">
        <Block caption="Comandă">
          <span className="font-mono font-bold">{data.orderReference}</span>
        </Block>
        <Block caption="Greutate">
          <span className="font-mono font-bold">{weightKg} kg</span>
        </Block>
        <Block caption="Curier">
          <span className="font-bold">{data.courier}</span>
        </Block>
      </div>

      <div className="px-4 py-2">
        <Block caption="Conținut">
          <p className="line-clamp-2">{data.productTitle}</p>
        </Block>
      </div>

      {/* Impact footer — the reason this parcel exists ------------------------ */}
      <div className="mt-auto border-t-2 border-black px-4 py-3">
        {data.donationNote ? (
          <p className="text-[10px] leading-snug font-bold">
            <span aria-hidden="true">♥</span> {data.donationNote}
          </p>
        ) : null}
        <p className="mt-1 text-[8px] leading-snug text-black/50">
          Urmărește coletul: {data.trackingUrl}
        </p>
      </div>
    </div>
  );
}

/**
 * Label preview + the "Descarcă eticheta (PDF)" action.
 *
 * Owns the QR canvas so the PDF exporter can lift the exact same QR bitmap
 * that is on screen, instead of re-encoding it separately.
 */
export function ShippingLabelPreview({
  data,
  className,
}: {
  data: ShippingLabelData;
  className?: string;
}) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    const canvas = qrRef.current;
    if (!canvas) {
      setError("Eticheta nu s-a putut genera. Reîncarcă pagina și încearcă din nou.");
      return;
    }
    setError(null);
    downloadShippingLabel(data, canvas.toDataURL("image/png"));
  };

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-ink-200 bg-ink-50 p-3">
        <ShippingLabel data={data} qrRef={qrRef} className="rounded-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleDownload}
          leftIcon={<Icons.download aria-hidden="true" className="h-5 w-5" />}
        >
          Descarcă eticheta (PDF)
        </Button>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-danger-600">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-ink-500">
          Lipește eticheta pe colet și lasă-l la orice Easybox în {" "}
          <strong className="font-bold">3 zile</strong>.
        </p>
      </div>
    </div>
  );
}
