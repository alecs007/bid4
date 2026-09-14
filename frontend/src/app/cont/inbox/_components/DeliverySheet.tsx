"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { Sheet, Skeleton } from "@/components/ui";
import type { DeliveryMethod } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function DeliverySheet({
  open,
  busy,
  onClose,
  onChoose,
  load,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onChoose: (deliveryMethodId: string) => void;
  load: () => Promise<DeliveryMethod[]>;
}) {
  const [methods, setMethods] = useState<DeliveryMethod[] | null>(null);

  useEffect(() => {
    if (!open || methods) return;
    let cancelled = false;
    void load().then((rows) => {
      if (!cancelled) setMethods(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [open, methods, load]);

  return (
    <Sheet open={open} onClose={onClose} title="Unde vrei livrarea?">
      {methods === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="text-center">
          <p className="text-[15px] text-ink-700">
            Nu ai nicio adresă salvată încă.
          </p>
          <Link
            href="/cont/setari"
            className="mt-2 inline-block font-display font-bold text-primary-700"
          >
            Adaugă una în setări
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {methods.map((method) => (
            <li key={method.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChoose(method.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-edge transition",
                  "hover:bg-ink-50 disabled:opacity-60",
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"
                >
                  {method.type === "EASYBOX" ? (
                    <Icons.locker className="h-4.5 w-4.5" />
                  ) : (
                    <Icons.delivery className="h-4.5 w-4.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[15px] font-bold text-ink-900">
                    {method.label}
                  </span>
                  <span className="block truncate text-[13px] text-ink-600">
                    {method.type === "EASYBOX"
                      ? (method.lockerName ?? "Easybox")
                      : `${method.homeAddress?.street ?? ""}, ${method.homeAddress?.city ?? ""}`}
                  </span>
                </span>
                <Icons.forward
                  aria-hidden="true"
                  className="h-4.5 w-4.5 shrink-0 text-ink-400"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
