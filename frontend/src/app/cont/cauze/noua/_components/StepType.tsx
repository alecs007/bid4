"use client";

import { Icons } from "@/components/icons";
import { Alert, RadioCard } from "@/components/ui";
import type { BeneficiaryType } from "@/lib/types";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

const CHOICES: {
  id: BeneficiaryType;
  label: string;
  description: string;
  icon: keyof typeof Icons;
}[] = [
  {
    id: "INDIVIDUAL",
    label: "Persoană fizică",
    description:
      "Un adult care are nevoie de ajutor — tratament, o situație grea, o pierdere. Banii ajung la el, după verificarea identității.",
    icon: "account",
  },
  {
    id: "MINOR",
    label: "Minor",
    description:
      "Un copil sub 18 ani. Fondurile ajung la tutorele legal verificat, niciodată direct la minor.",
    icon: "members",
  },
  {
    id: "NGO",
    label: "Organizație / ONG",
    description:
      "O asociație sau fundație înregistrată. Cerem statutul, CUI-ul și reprezentantul legal.",
    icon: "organization",
  },
];

export function StepType({ draft, set, errors }: StepProps) {
  const choose = (beneficiaryType: BeneficiaryType) =>
    set((current) => ({ ...current, beneficiaryType }));

  return (
    <div>
      <StepHeader
        title="Pentru cine strângi fonduri?"
        lead="De asta depinde ce documente îți cerem mai departe. Alege cu grijă — poți schimba, dar o iei puțin de la capăt."
      />

      <div
        role="radiogroup"
        aria-label="Tipul beneficiarului"
        className="flex flex-col gap-2.5"
      >
        {CHOICES.map((choice) => {
          const Glyph = Icons[choice.icon];
          return (
            <RadioCard
              key={choice.id}
              name="beneficiaryType"
              value={choice.id}
              checked={draft.beneficiaryType === choice.id}
              onChange={() => choose(choice.id)}
              label={choice.label}
              description={choice.description}
              icon={<Glyph aria-hidden="true" className="h-5 w-5" />}
            />
          );
        })}
      </div>

      {errors.beneficiaryType ? (
        <p
          role="alert"
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-danger-600"
        >
          <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />
          {errors.beneficiaryType}
        </p>
      ) : null}

      <Alert tone="sky" className="mt-5" title="De ce întrebăm">
        Pe bid4 pot strânge fonduri și persoane, nu doar organizații. Tocmai de
        aceea verificăm cine primește banii: e singurul mod în care cei care
        licitează pot avea încredere că ajutorul ajunge unde scrie.
      </Alert>
    </div>
  );
}
