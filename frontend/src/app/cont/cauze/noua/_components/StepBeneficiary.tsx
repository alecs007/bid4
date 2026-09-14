"use client";

import { Icons } from "@/components/icons";
import { Alert, Field, FileUpload, Input, Select } from "@/components/ui";
import { ROMANIAN_COUNTIES } from "@/lib/config";
import { GUARDIAN_RELATION } from "@/lib/labels";
import type { GuardianRelation, UploadedFileRef } from "@/lib/types";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

const COUNTY_OPTIONS = ROMANIAN_COUNTIES.map((county) => ({
  value: county,
  label: county,
}));

const RELATION_OPTIONS = (
  Object.keys(GUARDIAN_RELATION) as GuardianRelation[]
).map((relation) => ({ value: relation, label: GUARDIAN_RELATION[relation] }));

export function StepBeneficiary({ draft, set, errors }: StepProps) {
  const type = draft.beneficiaryType ?? "INDIVIDUAL";
  const isMinor = type === "MINOR";
  const isNgo = type === "NGO";

  const setBeneficiary = (patch: Partial<typeof draft.beneficiary>) =>
    set((current) => ({
      ...current,
      beneficiary: { ...current.beneficiary, ...patch },
    }));

  const setGuardian = (patch: Partial<typeof draft.guardian>) =>
    set((current) => ({
      ...current,
      guardian: { ...current.guardian, ...patch },
    }));

  const setNgo = (patch: Partial<typeof draft.ngo>) =>
    set((current) => ({ ...current, ngo: { ...current.ngo, ...patch } }));

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title={isMinor ? "Copilul și tutorele legal" : "Cine primește ajutorul"}
        lead={
          isNgo
            ? "Datele organizației, așa cum apar în actele ei."
            : "Datele beneficiarului, așa cum apar în actul de identitate."
        }
      />

      <Alert tone="sky" title="De ce cerem actele" icon={<Icons.secure className="h-5 w-5" />}>
        Nu publicăm niciodată aceste documente. Le vede doar echipa care verifică
        cauza. Fără ele nu putem garanta nimănui că banii ajung la persoana din
        poveste — și atunci nimeni nu ar mai licita.
      </Alert>

      <div className="flex flex-col gap-4">
        {isMinor ? (
          <p className="font-display text-sm font-extrabold text-ink-500">
            Despre copil
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isMinor ? "Numele copilului" : "Nume complet"}
            required
            error={errors["beneficiary.fullName"]}
            className={isMinor ? undefined : "sm:col-span-2"}
          >
            <Input
              value={draft.beneficiary.fullName}
              onChange={(event) =>
                setBeneficiary({ fullName: event.target.value })
              }
              placeholder="Ion Popescu"
              autoComplete="off"
            />
          </Field>

          {isMinor ? (
            <Field
              label="Vârsta"
              required
              error={errors["beneficiary.age"]}
              hint="În ani împliniți."
            >
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={17}
                value={draft.beneficiary.age}
                onChange={(event) => setBeneficiary({ age: event.target.value })}
                placeholder="7"
              />
            </Field>
          ) : null}

          <Field
            label="Email de contact"
            required
            error={errors["beneficiary.contactEmail"]}
          >
            <Input
              type="email"
              inputMode="email"
              value={draft.beneficiary.contactEmail}
              onChange={(event) =>
                setBeneficiary({ contactEmail: event.target.value })
              }
              placeholder="nume@exemplu.ro"
              leading={<Icons.email aria-hidden="true" className="h-4 w-4 shrink-0" />}
            />
          </Field>

          <Field
            label="Telefon"
            required
            error={errors["beneficiary.contactPhone"]}
          >
            <Input
              type="tel"
              inputMode="tel"
              value={draft.beneficiary.contactPhone}
              onChange={(event) =>
                setBeneficiary({ contactPhone: event.target.value })
              }
              placeholder="0722 123 456"
              leading={<Icons.phone aria-hidden="true" className="h-4 w-4 shrink-0" />}
            />
          </Field>

          <Field label="Județ" required error={errors["beneficiary.county"]}>
            <Select
              value={draft.beneficiary.county}
              options={COUNTY_OPTIONS}
              onChange={(county) => setBeneficiary({ county })}
              ariaLabel="Județ"
              placeholder="Alege județul"
              searchable
            />
          </Field>

          <Field label="Localitate" required error={errors["beneficiary.city"]}>
            <Input
              value={draft.beneficiary.city}
              onChange={(event) => setBeneficiary({ city: event.target.value })}
              placeholder="Cluj-Napoca"
            />
          </Field>
        </div>

        {!isMinor && !isNgo ? (
          <FileUpload
            label="Act de identitate (CI)"
            hint="O fotografie clară sau un scan. Verificăm numele și valabilitatea documentului."
            required
            value={draft.beneficiary.idDocument}
            onChange={(file?: UploadedFileRef) =>
              setBeneficiary({ idDocument: file })
            }
            error={errors["beneficiary.idDocument"]}
          />
        ) : null}
      </div>

      {isMinor ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-primary-50 p-4">
          <div>
            <p className="font-display text-sm font-extrabold text-primary-900">
              Tutorele legal
            </p>
            <p className="mt-1 text-sm text-primary-900/80">
              Fondurile ajung la tutorele legal verificat, niciodată direct la
              minor.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nume complet"
              required
              error={errors["guardian.fullName"]}
            >
              <Input
                value={draft.guardian.fullName}
                onChange={(event) =>
                  setGuardian({ fullName: event.target.value })
                }
                placeholder="Maria Popescu"
              />
            </Field>

            <Field
              label="Relația cu minorul"
              required
              error={errors["guardian.relationToMinor"]}
            >
              <Select
                value={draft.guardian.relationToMinor}
                options={RELATION_OPTIONS}
                onChange={(relationToMinor) => setGuardian({ relationToMinor })}
                ariaLabel="Relația cu minorul"
                placeholder="Alege relația"
              />
            </Field>

            <Field
              label="Telefon"
              required
              error={errors["guardian.phone"]}
              className="sm:col-span-2"
            >
              <Input
                type="tel"
                inputMode="tel"
                value={draft.guardian.phone}
                onChange={(event) => setGuardian({ phone: event.target.value })}
                placeholder="0722 123 456"
                leading={<Icons.phone aria-hidden="true" className="h-4 w-4 shrink-0" />}
              />
            </Field>
          </div>

          <FileUpload
            label="Act de identitate al tutorelui"
            required
            value={draft.guardian.idDocument}
            onChange={(file?: UploadedFileRef) =>
              setGuardian({ idDocument: file })
            }
            error={errors["guardian.idDocument"]}
          />

          <FileUpload
            label="Dovada calității de tutore"
            hint="Certificatul de naștere al copilului, o hotărâre judecătorească sau o dispoziție de plasament."
            required
            value={draft.guardian.guardianshipProof}
            onChange={(file?: UploadedFileRef) =>
              setGuardian({ guardianshipProof: file })
            }
            error={errors["guardian.guardianshipProof"]}
          />
        </div>
      ) : null}

      {isNgo ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-ink-50 p-4">
          <p className="font-display text-sm font-extrabold text-ink-700">
            Despre organizație
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Denumire legală"
              required
              error={errors["ngo.legalName"]}
              className="sm:col-span-2"
            >
              <Input
                value={draft.ngo.legalName}
                onChange={(event) => setNgo({ legalName: event.target.value })}
                placeholder="Asociația Zâmbet pentru Mâine"
              />
            </Field>

            <Field
              label="CUI"
              required
              error={errors["ngo.registrationNumber"]}
            >
              <Input
                value={draft.ngo.registrationNumber}
                onChange={(event) =>
                  setNgo({ registrationNumber: event.target.value })
                }
                placeholder="RO12345678"
              />
            </Field>

            <Field
              label="Reprezentant legal"
              required
              error={errors["ngo.representativeName"]}
            >
              <Input
                value={draft.ngo.representativeName}
                onChange={(event) =>
                  setNgo({ representativeName: event.target.value })
                }
                placeholder="Elena Marin"
              />
            </Field>
          </div>

          <FileUpload
            label="Statutul organizației"
            hint="Statutul și, dacă există, certificatul de înregistrare fiscală."
            required
            value={draft.ngo.statuteDoc}
            onChange={(file?: UploadedFileRef) => setNgo({ statuteDoc: file })}
            error={errors["ngo.statuteDoc"]}
          />

          <FileUpload
            label="Act de identitate al reprezentantului"
            required
            value={draft.ngo.representativeId}
            onChange={(file?: UploadedFileRef) =>
              setNgo({ representativeId: file })
            }
            error={errors["ngo.representativeId"]}
          />
        </div>
      ) : null}
    </div>
  );
}
