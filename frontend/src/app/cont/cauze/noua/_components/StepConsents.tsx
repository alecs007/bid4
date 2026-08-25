"use client";

import { Icons } from "@/components/icons";
import { Alert, Checkbox } from "@/components/ui";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

function ConsentError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-danger-600"
    >
      <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

export function StepConsents({ draft, set, errors }: StepProps) {
  const isMinor = draft.beneficiaryType === "MINOR";

  const setConsent = (patch: Partial<typeof draft.consents>) =>
    set((current) => ({
      ...current,
      consents: { ...current.consents, ...patch },
    }));

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title="Declarații"
        lead="Ultimul pas înainte de rezumat. Citește-le — sunt scurte și contează."
      />

      <div className="flex flex-col gap-4">
        <div>
          <Checkbox
            checked={draft.consents.truthfulness}
            onChange={(event) =>
              setConsent({ truthfulness: event.target.checked })
            }
            label="Declar pe propria răspundere că informațiile și documentele sunt reale."
            description="Datele false sau documentele modificate duc la respingerea cauzei și la închiderea contului."
          />
          <ConsentError message={errors["consents.truthfulness"]} />
        </div>

        <div>
          <Checkbox
            checked={draft.consents.controlledRelease}
            onChange={(event) =>
              setConsent({ controlledRelease: event.target.checked })
            }
            label="Sunt de acord ca fondurile să fie eliberate controlat."
            description="Pentru sume mari, banii vin în tranșe, iar bid4 poate cere dovezi de utilizare între ele."
          />
          <ConsentError message={errors["consents.controlledRelease"]} />
        </div>

        {isMinor ? (
          <div>
            <Checkbox
              checked={draft.consents.guardianAuthority}
              onChange={(event) =>
                setConsent({ guardianAuthority: event.target.checked })
              }
              label="Confirm că sunt tutorele legal al minorului și am dreptul să îl reprezint."
              description="Fondurile ajung în contul tutorelui verificat, niciodată direct la minor."
            />
            <ConsentError message={errors["consents.guardianAuthority"]} />
          </div>
        ) : null}

        <div>
          <Checkbox
            checked={draft.consents.terms}
            onChange={(event) => setConsent({ terms: event.target.checked })}
            label="Accept Termenii și Condițiile și Politica de confidențialitate."
            description="Documentele de identitate se păstrează separat de partea publică a platformei și se șterg după perioada legală."
          />
          <ConsentError message={errors["consents.terms"]} />
        </div>
      </div>

      <Alert tone="sky" title="Ce facem noi și ce nu putem promite">
        bid4 verifică actele și povestea cât de bine poate, în limita
        documentelor primite, și ține banii în escrow până ajung la destinație.
        Suntem intermediar între tine și cei care licitează: nu garantăm un
        rezultat medical sau social și nu suntem parte în relația ta cu
        furnizorii de servicii.
      </Alert>
    </div>
  );
}
