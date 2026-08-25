"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Alert, Button, Field, Input } from "@/components/ui";
import { CAUSE } from "@/lib/config";
import { formatMoney, parseLeiInput } from "@/lib/money";
import { cn } from "@/lib/utils/cn";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

export function StepGoal({ draft, set, errors }: StepProps) {
  const [connecting, setConnecting] = useState(false);

  const setGoal = (patch: Partial<typeof draft.goal>) =>
    set((current) => ({ ...current, goal: { ...current.goal, ...patch } }));

  const setPayout = (patch: Partial<typeof draft.payout>) =>
    set((current) => ({ ...current, payout: { ...current.payout, ...patch } }));

  /** TODO(backend): Stripe Connect onboarding — redirect out, return with an
   *  account id, and read `charges_enabled` rather than trusting this flag. */
  const connect = async () => {
    setConnecting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setPayout({ stripeOnboarded: true });
    setConnecting(false);
  };

  const goal = parseLeiInput(draft.goal.amountLei);

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title="Obiectiv și încasare"
        lead="Cât ai nevoie și unde ajung banii după ce o licitație se încheie."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Obiectiv"
          required
          error={errors["goal.amountLei"]}
          hint={`Între ${formatMoney(CAUSE.MIN_GOAL, { compact: true })} și ${formatMoney(CAUSE.MAX_GOAL, { compact: true })}.`}
        >
          <Input
            inputMode="decimal"
            value={draft.goal.amountLei}
            onChange={(event) => setGoal({ amountLei: event.target.value })}
            placeholder="25.000"
            trailing="lei"
          />
        </Field>

        <Field
          label="Termen limită"
          optionalLabel
          error={errors["goal.deadline"]}
          hint="Dacă situația are un termen real — o operație, un început de an școlar."
        >
          <Input
            type="date"
            value={draft.goal.deadline}
            onChange={(event) => setGoal({ deadline: event.target.value })}
          />
        </Field>
      </div>

      {goal !== null && goal > 0 ? (
        <p className="numeric text-sm text-ink-600">
          Obiectiv: <strong className="text-ink-900">{formatMoney(goal)}</strong>
        </p>
      ) : null}

      {/* --- payout ------------------------------------------------------ */}

      <div className="flex flex-col gap-4 rounded-2xl bg-ink-50 p-4">
        <div>
          <p className="font-display text-sm font-extrabold text-ink-700">
            Contul în care primești fondurile
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Banii stau în escrow la bid4 până cumpărătorul confirmă coletul, apoi
            partea donată pleacă spre acest cont. Pentru sume mari, eliberarea se
            face în tranșe, pe baza dovezilor de utilizare.
          </p>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl p-3.5 ring-1",
            draft.payout.stripeOnboarded
              ? "bg-primary-50 ring-primary-200"
              : "bg-white ring-edge",
          )}
        >
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              draft.payout.stripeOnboarded
                ? "bg-primary-600 text-white"
                : "bg-ink-100 text-ink-600",
            )}
          >
            {draft.payout.stripeOnboarded ? (
              <Icons.check aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Icons.payment aria-hidden="true" className="h-5 w-5" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-extrabold text-ink-900">
              {draft.payout.stripeOnboarded
                ? "Cont de încasare conectat"
                : "Conectează contul Stripe"}
            </span>
            <span className="block text-xs text-ink-600">
              {draft.payout.stripeOnboarded
                ? "Poți primi fonduri după aprobarea cauzei."
                : "Verificarea identității se face la Stripe, nu la noi."}
            </span>
          </span>

          {draft.payout.stripeOnboarded ? null : (
            <Button size="sm" onClick={connect} loading={connecting}>
              Conectează
            </Button>
          )}
        </div>

        {errors["payout.stripeOnboarded"] ? (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm font-semibold text-danger-600"
          >
            <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />
            {errors["payout.stripeOnboarded"]}
          </p>
        ) : null}

        <Field
          label="IBAN"
          required
          error={errors["payout.iban"]}
          hint="Contul trebuie să fie pe numele beneficiarului sau al organizației."
        >
          <Input
            value={draft.payout.iban}
            onChange={(event) => setPayout({ iban: event.target.value })}
            placeholder="RO49 AAAA 1B31 0075 9384 0000"
            autoComplete="off"
          />
        </Field>
      </div>

      <Alert tone="sun" title="Plafon până la verificarea completă">
        Până când verificarea se încheie, cauza poate strânge maximum{" "}
        <strong>{formatMoney(CAUSE.UNVERIFIED_CAP)}</strong>. După aprobare,
        plafonul dispare.
      </Alert>
    </div>
  );
}
