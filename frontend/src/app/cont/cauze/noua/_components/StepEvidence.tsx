"use client";

import { Icons } from "@/components/icons";
import { Alert, Button, Field, FileUpload, Input, Select } from "@/components/ui";
import { CAUSE } from "@/lib/config";
import { EVIDENCE_TYPE } from "@/lib/labels";
import type { CauseEvidenceType, UploadedFileRef } from "@/lib/types";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

const TYPE_OPTIONS = (Object.keys(EVIDENCE_TYPE) as CauseEvidenceType[]).map(
  (type) => ({ value: type, label: EVIDENCE_TYPE[type] }),
);

/** What an operator will look for, by the kind of story being told. */
const SUGGESTED: Partial<Record<string, CauseEvidenceType[]>> = {
  medical: ["MEDICAL_RECORD", "MEDICAL_LETTER", "TREATMENT_QUOTE"],
  copii: ["SOCIAL_REPORT", "SCHOOL_PROOF", "INCOME_PROOF"],
  educatie: ["SCHOOL_PROOF", "INCOME_PROOF"],
  animale: ["VET_RECORD", "TREATMENT_QUOTE"],
  urgente: ["DAMAGE_PROOF", "SOCIAL_REPORT"],
  varstnici: ["MEDICAL_RECORD", "SOCIAL_REPORT", "INCOME_PROOF"],
  comunitate: ["SOCIAL_REPORT", "TREATMENT_QUOTE"],
  mediu: ["DAMAGE_PROOF"],
};

export function StepEvidence({ draft, set, errors }: StepProps) {
  const suggestions = SUGGESTED[draft.story.category] ?? ["SOCIAL_REPORT"];

  const add = (type: CauseEvidenceType | "" = "") =>
    set((current) => ({
      ...current,
      documents: [
        ...current.documents,
        { id: crypto.randomUUID(), type, note: "" },
      ],
    }));

  const update = (
    id: string,
    patch: Partial<(typeof draft.documents)[number]>,
  ) =>
    set((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === id ? { ...document, ...patch } : document,
      ),
    }));

  const remove = (id: string) =>
    set((current) => ({
      ...current,
      documents: current.documents.filter((document) => document.id !== id),
    }));

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title="Dovezile"
        lead="Documentele nu ajung niciodată public. Le vede doar echipa care verifică — și fără ele cauza nu poate fi aprobată."
      />

      {suggestions.length ? (
        <Alert tone="sky" title="Ce ne-ar ajuta cel mai mult aici">
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {suggestions.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => add(type)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs font-bold text-ink-700 ring-1 ring-edge transition hover:ring-primary-400"
                >
                  <Icons.add aria-hidden="true" className="h-3.5 w-3.5" />
                  {EVIDENCE_TYPE[type]}
                </button>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        {draft.documents.map((document, index) => (
          <div
            key={document.id}
            className="flex flex-col gap-3 rounded-2xl bg-ink-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-sm font-extrabold text-ink-700">
                Document {index + 1}
              </p>
              <button
                type="button"
                onClick={() => remove(document.id)}
                aria-label={`Șterge documentul ${index + 1}`}
                className="rounded-xl p-1.5 text-ink-500 transition hover:bg-white hover:text-danger-600"
              >
                <Icons.remove aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <Field
              label="Tipul documentului"
              required
              error={errors[`documents.${index}.type`]}
            >
              <Select
                value={document.type}
                options={TYPE_OPTIONS}
                onChange={(type) =>
                  update(document.id, { type: type as CauseEvidenceType | "" })
                }
                ariaLabel={`Tipul documentului ${index + 1}`}
                placeholder="Alege tipul"
              />
            </Field>

            <FileUpload
              label="Fișier"
              required
              value={document.file}
              onChange={(file?: UploadedFileRef) =>
                update(document.id, { file })
              }
              error={errors[`documents.${index}.file`]}
            />

            <Field
              label="Notă"
              optionalLabel
              error={errors[`documents.${index}.note`]}
              hint="Ce ar trebui să știe operatorul despre acest document."
            >
              <Input
                value={document.note}
                onChange={(event) =>
                  update(document.id, { note: event.target.value })
                }
                placeholder="Devizul de la spitalul din Cluj, valabil 60 de zile."
                maxLength={200}
              />
            </Field>
          </div>
        ))}
      </div>

      {draft.documents.length < CAUSE.MAX_DOCUMENTS ? (
        <Button
          variant="secondary"
          onClick={() => add()}
          leftIcon={<Icons.add aria-hidden="true" className="h-4 w-4" />}
        >
          Adaugă un document
        </Button>
      ) : null}

      {errors.documents ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm font-semibold text-danger-600"
        >
          <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />
          {errors.documents}
        </p>
      ) : null}

      <Alert tone="warning" title="Fără dovezi, cauza nu poate fi aprobată">
        Ai nevoie de cel puțin {CAUSE.MIN_DOCUMENTS} document. Operatorii verifică
        dacă actele se potrivesc cu povestea și cu persoana care primește banii.
      </Alert>
    </div>
  );
}
