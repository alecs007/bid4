"use client";

import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { Alert, Badge } from "@/components/ui";
import { CAUSE, CAUSE_CATEGORIES } from "@/lib/config";
import { BENEFICIARY_TYPE, EVIDENCE_TYPE, GUARDIAN_RELATION } from "@/lib/labels";
import { formatMoney, parseLeiInput } from "@/lib/money";
import { formatDateRo } from "@/lib/utils/date";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-ink-50 p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-extrabold text-ink-700">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-primary-700 transition hover:bg-white"
        >
          <Icons.edit aria-hidden="true" className="h-3.5 w-3.5" />
          Modifică
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-line py-2 first:border-t-0 first:pt-0">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-sm font-bold text-ink-900">{value || "—"}</dd>
    </div>
  );
}

export function StepSummary({
  draft,
  onEdit,
}: StepProps & { onEdit: (step: number) => void }) {
  const type = draft.beneficiaryType ?? "INDIVIDUAL";
  const goal = parseLeiInput(draft.goal.amountLei);
  const category = CAUSE_CATEGORIES.find(
    (item) => item.id === draft.story.category,
  );

  return (
    <div className="flex flex-col gap-4">
      <StepHeader
        title="Verifică tot, apoi trimite"
        lead="După trimitere nu mai poți schimba datele până când un operator se uită peste ele."
      />

      <Section title="Tipul cauzei" onEdit={() => onEdit(0)}>
        <Badge tone="primary">{BENEFICIARY_TYPE[type]}</Badge>
      </Section>

      <Section title="Cine primește ajutorul" onEdit={() => onEdit(1)}>
        <dl>
          <Row
            label={type === "MINOR" ? "Copil" : "Beneficiar"}
            value={draft.beneficiary.fullName}
          />
          {type === "MINOR" ? (
            <Row label="Vârstă" value={`${draft.beneficiary.age} ani`} />
          ) : null}
          <Row label="Email" value={draft.beneficiary.contactEmail} />
          <Row label="Telefon" value={draft.beneficiary.contactPhone} />
          <Row
            label="Localitate"
            value={[draft.beneficiary.city, draft.beneficiary.county]
              .filter(Boolean)
              .join(", ")}
          />
          {type === "INDIVIDUAL" ? (
            <Row label="Act de identitate" value={draft.beneficiary.idDocument?.fileName} />
          ) : null}
          {type === "MINOR" ? (
            <>
              <Row label="Tutore" value={draft.guardian.fullName} />
              <Row
                label="Relația"
                value={
                  draft.guardian.relationToMinor
                    ? GUARDIAN_RELATION[draft.guardian.relationToMinor]
                    : ""
                }
              />
              <Row label="Telefon tutore" value={draft.guardian.phone} />
              <Row label="Act tutore" value={draft.guardian.idDocument?.fileName} />
              <Row
                label="Dovada tutelei"
                value={draft.guardian.guardianshipProof?.fileName}
              />
            </>
          ) : null}
          {type === "NGO" ? (
            <>
              <Row label="Organizație" value={draft.ngo.legalName} />
              <Row label="CUI" value={draft.ngo.registrationNumber} />
              <Row label="Reprezentant" value={draft.ngo.representativeName} />
              <Row label="Statut" value={draft.ngo.statuteDoc?.fileName} />
              <Row
                label="Act reprezentant"
                value={draft.ngo.representativeId?.fileName}
              />
            </>
          ) : null}
        </dl>
      </Section>

      <Section title="Povestea" onEdit={() => onEdit(2)}>
        <dl>
          <Row label="Titlu" value={draft.story.name} />
          <Row
            label="Categorie"
            value={category ? `${category.emoji} ${category.label}` : ""}
          />
          <Row label="Unde" value={draft.story.location} />
          <Row label="Copertă" value={draft.story.coverImage?.fileName} />
          <Row
            label="Galerie"
            value={
              draft.story.gallery.length
                ? `${draft.story.gallery.length} imagini`
                : "—"
            }
          />
        </dl>
        <p className="mt-2 line-clamp-3 text-sm text-ink-600">
          {draft.story.shortDescription}
        </p>
      </Section>

      <Section title="Dovezi" onEdit={() => onEdit(3)}>
        {draft.documents.length === 0 ? (
          <p className="text-sm text-ink-600">Niciun document.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {draft.documents.map((document) => (
              <li
                key={document.id}
                className="flex items-center gap-2 text-sm text-ink-800"
              >
                <Icons.invoice
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-ink-400"
                />
                <span className="min-w-0 flex-1 truncate">
                  {document.file?.fileName}
                </span>
                <span className="shrink-0 text-xs font-bold text-ink-500">
                  {document.type ? EVIDENCE_TYPE[document.type] : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Obiectiv și încasare" onEdit={() => onEdit(4)}>
        <dl>
          <Row
            label="Obiectiv"
            value={goal !== null ? formatMoney(goal) : ""}
          />
          <Row
            label="Termen"
            value={
              draft.goal.deadline ? formatDateRo(draft.goal.deadline) : "Fără termen"
            }
          />
          <Row
            label="Cont de încasare"
            value={draft.payout.stripeOnboarded ? "Conectat" : "Neconectat"}
          />
          <Row label="IBAN" value={draft.payout.iban} />
        </dl>
      </Section>

      <Alert tone="sky" title="Ce urmează">
        Trimiterea o pune în coada de verificare. Un operator se uită peste acte
        în aproximativ {CAUSE.REVIEW_HOURS} de ore și îți scrie pe email fie că
        e aprobată, fie ce mai lipsește.
      </Alert>
    </div>
  );
}
