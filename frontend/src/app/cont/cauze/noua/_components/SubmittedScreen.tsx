"use client";

import { Icons } from "@/components/icons";
import { ButtonLink, Confetti, Mascot } from "@/components/ui";
import { CAUSE } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import type { CauseDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const TIMELINE = [
  {
    icon: "check" as const,
    title: "Trimisă",
    body: "Am primit cauza și documentele. Deocamdată nimic nu este public.",
    done: true,
  },
  {
    icon: "secure" as const,
    title: "Verificare",
    body: `Un operator compară actele cu povestea. Durează aproximativ ${CAUSE.REVIEW_HOURS} de ore, iar rezultatul ajunge pe email.`,
    done: false,
  },
  {
    icon: "success" as const,
    title: "Aprobare",
    body: "Cauza devine publică și poate primi listări.",
    done: false,
  },
  {
    icon: "donation" as const,
    title: "Primești fonduri",
    body: "Vânzătorii îți pot alege cauza. Plata rămâne protejată până la livrarea coletului, apoi partea donată ajunge la tine.",
    done: false,
  },
];

export function SubmittedScreen({ cause }: { cause: CauseDetail }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <Confetti />
      <Mascot mood="cheer" size={104} floating />

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Cauza ta a fost trimisă spre verificare
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-ink-600">
          <strong className="text-ink-900">{cause.name}</strong> este în curs de
          verificare. Îți scriem pe {cause.validation.contactEmail} imediat ce
          analizăm documentele.
        </p>
      </div>

      <ol className="w-full max-w-md text-left">
        {TIMELINE.map((entry, index) => {
          const Glyph = Icons[entry.icon];
          const last = index === TIMELINE.length - 1;
          return (
            <li key={entry.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    entry.done
                      ? "bg-primary-600 text-white"
                      : "bg-ink-100 text-ink-500",
                  )}
                >
                  <Glyph aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                {last ? null : <span className="w-0.5 flex-1 bg-line" />}
              </div>
              <div className={cn("min-w-0", last ? "pb-0" : "pb-5")}>
                <p className="font-display font-extrabold text-ink-900">
                  {entry.title}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">{entry.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="max-w-md text-sm text-ink-500">
        Până la verificarea completă, cauza poate strânge maximum{" "}
        <strong className="text-ink-700">
          {formatMoney(CAUSE.UNVERIFIED_CAP)}
        </strong>
        .
      </p>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <ButtonLink href="/cont/cauze" size="lg">
          Vezi cauzele mele
        </ButtonLink>
        <ButtonLink href="/cauze" variant="secondary" size="lg">
          Vezi alte cauze
        </ButtonLink>
      </div>
    </div>
  );
}
