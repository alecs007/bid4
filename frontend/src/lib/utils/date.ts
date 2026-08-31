import {
  differenceInHours,
  format,
  formatDistanceToNowStrict,
  isPast,
  parseISO,
} from "date-fns";
import { ro } from "date-fns/locale";

import type { ISODateString } from "@/lib/types";

function toDate(value: ISODateString | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** "21 aug. 2026" */
export function formatDateRo(value: ISODateString | Date): string {
  return format(toDate(value), "d MMM yyyy", { locale: ro });
}

/** "21 august 2026" — for documents and invoices. */
export function formatDateLongRo(value: ISODateString | Date): string {
  return format(toDate(value), "d MMMM yyyy", { locale: ro });
}

/** "21 aug. 2026, 14:30" */
export function formatDateTimeRo(value: ISODateString | Date): string {
  return format(toDate(value), "d MMM yyyy, HH:mm", { locale: ro });
}

/** "14:30" */
export function formatTimeRo(value: ISODateString | Date): string {
  return format(toDate(value), "HH:mm", { locale: ro });
}

/** "acum 3 minute" / "în 2 zile" */
export function formatRelativeRo(value: ISODateString | Date): string {
  const date = toDate(value);
  const distance = formatDistanceToNowStrict(date, { locale: ro });
  return isPast(date) ? `acum ${distance}` : `în ${distance}`;
}

/** "membru din august 2026" */
export function formatMemberSince(value: ISODateString | Date): string {
  return format(toDate(value), "MMMM yyyy", { locale: ro });
}

export function hoursUntil(value: ISODateString): number {
  return differenceInHours(parseISO(value), new Date());
}

/** ISO helper used all over the mock layer. */
export function isoIn(
  amount: number,
  unit: "minutes" | "hours" | "days",
): ISODateString {
  const multipliers = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
  return new Date(Date.now() + amount * multipliers[unit]).toISOString();
}

export function isoAgo(
  amount: number,
  unit: "minutes" | "hours" | "days",
): ISODateString {
  return isoIn(-amount, unit);
}
