import { jsPDF } from "jspdf";

import type { ShippingLabelData } from "@/lib/types";
import { formatDateTimeRo } from "@/lib/utils/date";

/**
 * Client-side AWB label renderer — the PDF twin of <ShippingLabel />.
 *
 * Layout is expressed in millimetres on a 100 x 150 mm thermal label, matching
 * the on-screen component's proportions 1:1. If you change one, change both.
 *
 * TODO(backend): once Sameday Easybox is wired up, `lib/api/shipping.ts` will
 * return a real, courier-issued label PDF and this becomes a preview-only
 * fallback for development.
 */

const W = 100;
const H = 150;
const M = 6; // left/right margin
const RIGHT = W - M;

/**
 * jsPDF's built-in fonts are WinAnsi-encoded and have no glyphs for ă î â ș ț.
 * Rather than embedding a ~300 KB TTF into the bundle for a thermal label, we
 * transliterate — which is what courier labels do in practice anyway.
 */
function pdfText(value: string): string {
  return value
    .replace(/[ăâĂÂ]/g, (c) => (c === c.toUpperCase() ? "A" : "a"))
    .replace(/[șşȘŞ]/g, (c) => (c === c.toUpperCase() ? "S" : "s"))
    .replace(/[țţȚŢ]/g, (c) => (c === c.toUpperCase() ? "T" : "t"))
    .replace(/[îÎ]/g, (c) => (c === c.toUpperCase() ? "I" : "i"))
    .replace(/[^\x20-\x7E]/g, "");
}

interface Ctx {
  doc: jsPDF;
  y: number;
}

function caption(ctx: Ctx, text: string, x = M): void {
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(5.5);
  ctx.doc.setTextColor(120);
  ctx.doc.text(pdfText(text.toUpperCase()), x, ctx.y);
  ctx.doc.setTextColor(0);
}

function body(
  ctx: Ctx,
  text: string,
  x: number,
  size = 7.5,
  style: "normal" | "bold" = "normal",
  font: "helvetica" | "courier" = "helvetica",
): void {
  ctx.doc.setFont(font, style);
  ctx.doc.setFontSize(size);
  ctx.doc.text(pdfText(text), x, ctx.y);
}

function dashed(doc: jsPDF, y: number): void {
  doc.setDrawColor(140);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M, y, RIGHT, y);
  doc.setLineDashPattern([], 0);
}

function solid(doc: jsPDF, y: number, width = 0.6): void {
  doc.setDrawColor(0);
  doc.setLineWidth(width);
  doc.line(0, y, W, y);
}

/** The bid4 mark, drawn as vectors so it stays crisp at any print size. */
function drawLogo(doc: jsPDF, x: number, y: number, size: number): void {
  doc.setFillColor(88, 204, 2);
  doc.roundedRect(x, y, size, size, size * 0.28, size * 0.28, "F");

  // A heart from two discs and a triangle.
  const cx = x + size / 2;
  const r = size * 0.19;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx - r * 0.85, y + size * 0.4, r, "F");
  doc.circle(cx + r * 0.85, y + size * 0.4, r, "F");
  doc.triangle(
    cx - r * 1.72,
    y + size * 0.45,
    cx + r * 1.72,
    y + size * 0.45,
    cx,
    y + size * 0.82,
    "F",
  );
}

export function buildLabelFileName(data: ShippingLabelData): string {
  return `eticheta-${data.orderReference}-${data.awb}.pdf`;
}

/**
 * Renders the label to a jsPDF document.
 * `qrDataUrl` is a PNG data URL — grab it from the <ShippingLabel> canvas via
 * `canvas.toDataURL("image/png")`.
 */
export function renderShippingLabel(
  data: ShippingLabelData,
  qrDataUrl: string,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [W, H], orientation: "portrait" });
  const ctx: Ctx = { doc, y: 0 };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  /* -- Header ------------------------------------------------------------- */
  drawLogo(doc, M, 4.5, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("bid4", M + 9.5, 11);

  doc.setFontSize(8.5);
  doc.text(pdfText(data.serviceName), RIGHT, 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(110);
  doc.text(pdfText(formatDateTimeRo(data.issuedAt)), RIGHT, 11.5, {
    align: "right",
  });
  doc.setTextColor(0);
  solid(doc, 15, 0.8);

  /* -- Destination headline ------------------------------------------------ */
  const isEasybox = data.deliveryType === "EASYBOX";
  ctx.y = 20;
  caption(ctx, isEasybox ? "Easybox destinatie" : "Livrare la adresa");

  if (isEasybox) {
    ctx.y = 29;
    body(ctx, data.lockerId ?? "", M, 20, "bold", "courier");
    ctx.y = 33.5;
    body(ctx, data.lockerName ?? "", M, 8, "bold");
  } else {
    ctx.y = 28;
    body(ctx, data.recipient.name, M, 14, "bold");
  }
  dashed(doc, 37);

  /* -- Recipient + QR ------------------------------------------------------ */
  ctx.y = 42;
  caption(ctx, "Destinatar");
  ctx.y = 46.5;
  body(ctx, data.recipient.name, M, 8, "bold");
  for (const line of data.recipient.addressLines.slice(0, 3)) {
    ctx.y += 3.6;
    body(ctx, line, M, 7.5);
  }
  ctx.y += 4;
  body(ctx, data.recipient.phone, M, 7.5, "normal", "courier");

  doc.addImage(qrDataUrl, "PNG", RIGHT - 27, 40, 27, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(120);
  doc.text("SCANEAZA LA LOCKER", RIGHT - 13.5, 70, { align: "center" });
  doc.setTextColor(0);

  /* -- AWB band ------------------------------------------------------------ */
  doc.setFillColor(243, 243, 241);
  doc.rect(0, 73, W, 15, "F");
  ctx.y = 78.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(120);
  doc.text("COD AWB", W / 2, ctx.y, { align: "center" });
  doc.setTextColor(0);
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.text(pdfText(data.awb), W / 2, 85.5, { align: "center" });
  solid(doc, 88, 0.8);

  /* -- Sender -------------------------------------------------------------- */
  ctx.y = 94;
  caption(ctx, "Expeditor");
  ctx.y = 98.5;
  body(ctx, data.sender.name, M, 8, "bold");
  for (const line of data.sender.addressLines.slice(0, 3)) {
    ctx.y += 3.6;
    body(ctx, line, M, 7.5);
  }
  ctx.y += 4;
  body(ctx, data.sender.phone, M, 7.5, "normal", "courier");
  dashed(doc, 116);

  /* -- Parcel details ------------------------------------------------------ */
  const columns = [M, M + 32, M + 62];
  const details: [string, string][] = [
    ["Comanda", data.orderReference],
    ["Greutate", `${(data.weightGrams / 1000).toFixed(2)} kg`],
    ["Curier", data.courier],
  ];
  ctx.y = 121;
  details.forEach(([label], index) => caption(ctx, label, columns[index]));
  ctx.y = 125.5;
  details.forEach(([, value], index) =>
    body(ctx, value, columns[index] ?? M, 8, "bold"),
  );
  dashed(doc, 129);

  /* -- Contents ------------------------------------------------------------ */
  ctx.y = 134;
  caption(ctx, "Continut");
  ctx.y = 138;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const titleLines = doc.splitTextToSize(pdfText(data.productTitle), RIGHT - M);
  doc.text(titleLines.slice(0, 2), M, ctx.y);

  /* -- Impact footer -------------------------------------------------------- */
  solid(doc, 141, 0.8);
  if (data.donationNote) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const noteLines = doc.splitTextToSize(pdfText(data.donationNote), RIGHT - M);
    doc.text(noteLines.slice(0, 2), M, 145);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(130);
  doc.text(pdfText(`Urmareste coletul: ${data.trackingUrl}`), M, 148.5);

  return doc;
}

/** Renders and hands the file to the browser. */
export function downloadShippingLabel(
  data: ShippingLabelData,
  qrDataUrl: string,
): void {
  renderShippingLabel(data, qrDataUrl).save(buildLabelFileName(data));
}
