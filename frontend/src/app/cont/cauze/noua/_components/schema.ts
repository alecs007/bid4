import { z } from "zod";

import { CAUSE, CAUSE_CATEGORIES } from "@/lib/config";
import { parseLeiInput } from "@/lib/money";
import type {
  BeneficiaryType,
  CauseApplicationDraft,
  CauseApplicationPayload,
} from "@/lib/types";

export const EMPTY_DRAFT: CauseApplicationDraft = {
  beneficiaryType: undefined,
  beneficiary: {
    fullName: "",
    contactEmail: "",
    contactPhone: "",
    county: "",
    city: "",
    age: "",
  },
  guardian: {
    fullName: "",
    relationToMinor: "",
    phone: "",
  },
  ngo: {
    legalName: "",
    registrationNumber: "",
    representativeName: "",
  },
  story: {
    name: "",
    category: "",
    shortDescription: "",
    story: "",
    location: "",
    gallery: [],
  },
  documents: [],
  goal: {
    amountLei: "",
    deadline: "",
  },
  payout: {
    method: "STRIPE_INDIVIDUAL",
    iban: "",
    stripeOnboarded: false,
  },
  consents: {
    truthfulness: false,
    controlledRelease: false,
    terms: false,
    guardianAuthority: false,
  },
};

export const STEPS = [
  { id: "type", label: "Tipul cauzei" },
  { id: "beneficiary", label: "Cine primește" },
  { id: "story", label: "Povestea" },
  { id: "evidence", label: "Dovezi" },
  { id: "goal", label: "Obiectiv" },
  { id: "consents", label: "Declarații" },
  { id: "summary", label: "Rezumat" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

const fileShape = {
  fileName: z.string(),
  fileRef: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  previewUrl: z.string().optional(),
};

const fileRef = z.object(fileShape);

const requiredFile = (message: string) => z.object(fileShape, { error: message });

const required = (message: string) => z.string().trim().min(1, message);

const fullName = (message: string) =>
  z
    .string()
    .trim()
    .min(3, message)
    .refine((value) => value.split(/\s+/).length >= 2, {
      error: "Completează numele și prenumele.",
    });

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.-]/g, ""))
  .refine((value) => /^(\+4)?0[237][0-9]{8}$/.test(value), {
    error: "Număr de telefon invalid (ex. 0722 123 456).",
  });

const iban = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, "").toUpperCase())
  .refine((value) => /^RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}$/.test(value), {
    error: "IBAN invalid. Are 24 de caractere și începe cu RO.",
  });

const categoryIds = CAUSE_CATEGORIES.map((item) => item.id);

const typeStep = z.object({
  beneficiaryType: z.enum(["INDIVIDUAL", "MINOR", "NGO"], {
    error: "Alege pentru cine strângi fonduri.",
  }),
});

function beneficiaryStep(type: BeneficiaryType) {
  const base = {
    fullName: fullName(
      type === "MINOR"
        ? "Completează numele complet al copilului."
        : "Completează numele complet al beneficiarului.",
    ),
    contactEmail: z.email("Adresa de email nu pare validă."),
    contactPhone: phone,
    county: required("Alege județul."),
    city: required("Completează localitatea."),
  };

  if (type === "MINOR") {
    return z.object({
      beneficiary: z.object({
        ...base,
        age: z
          .string()
          .trim()
          .min(1, "Completează vârsta copilului.")
          .refine((value) => /^\d{1,2}$/.test(value), {
            error: "Vârsta se scrie în ani împliniți.",
          })
          .refine(
            (value) => Number(value) >= CAUSE.MIN_BENEFICIARY_AGE,
            { error: "Vârsta nu poate fi negativă." },
          )
          .refine((value) => Number(value) <= CAUSE.MAX_MINOR_AGE, {
            error: `Peste ${CAUSE.MAX_MINOR_AGE} ani cauza se depune ca persoană fizică.`,
          }),
        idDocument: fileRef.optional(),
      }),
      guardian: z.object({
        fullName: fullName("Completează numele complet al tutorelui."),
        relationToMinor: z.enum(
          ["PARENT", "GRANDPARENT", "SIBLING", "LEGAL_GUARDIAN", "OTHER"],
          { error: "Alege relația cu minorul." },
        ),
        phone,
        idDocument: requiredFile("Încarcă actul de identitate al tutorelui."),
        guardianshipProof: requiredFile("Încarcă dovada calității de tutore legal."),
      }),
    });
  }

  if (type === "NGO") {
    return z.object({
      beneficiary: z.object(base),
      ngo: z.object({
        legalName: required("Completează denumirea legală a organizației."),
        registrationNumber: z
          .string()
          .trim()
          .regex(/^(RO)?[0-9]{2,10}$/, "CUI invalid (ex. RO12345678)."),
        representativeName: fullName("Completează numele reprezentantului legal."),
        statuteDoc: requiredFile("Încarcă statutul organizației."),
        representativeId: requiredFile("Încarcă actul de identitate al reprezentantului."),
      }),
    });
  }

  return z.object({
    beneficiary: z.object({
      ...base,
      idDocument: requiredFile("Încarcă actul de identitate al beneficiarului."),
    }),
  });
}

const storyStep = z.object({
  story: z.object({
    name: z
      .string()
      .trim()
      .min(6, "Titlul are nevoie de cel puțin 6 caractere.")
      .max(80, "Titlul depășește 80 de caractere."),
    category: z.enum(categoryIds as [string, ...string[]], {
      error: "Alege o categorie.",
    }),
    shortDescription: z
      .string()
      .trim()
      .min(30, "Descrierea scurtă are nevoie de cel puțin 30 de caractere.")
      .max(
        CAUSE.SHORT_DESCRIPTION_MAX,
        `Descrierea scurtă are maximum ${CAUSE.SHORT_DESCRIPTION_MAX} de caractere.`,
      ),
    story: z
      .string()
      .trim()
      .min(
        CAUSE.STORY_MIN,
        `Povestea are nevoie de cel puțin ${CAUSE.STORY_MIN} de caractere.`,
      )
      .max(CAUSE.STORY_MAX, `Povestea depășește ${CAUSE.STORY_MAX} de caractere.`),
    location: required("Completează localitatea și județul."),
    coverImage: requiredFile("Alege o imagine de copertă."),
  }),
});

const evidenceStep = z.object({
  documents: z
    .array(
      z.object({
        type: z.enum(
          [
            "MEDICAL_RECORD",
            "MEDICAL_LETTER",
            "TREATMENT_QUOTE",
            "SOCIAL_REPORT",
            "INCOME_PROOF",
            "SCHOOL_PROOF",
            "VET_RECORD",
            "DAMAGE_PROOF",
            "OTHER",
          ],
          { error: "Alege tipul documentului." },
        ),
        file: requiredFile("Încarcă fișierul."),
        note: z.string().max(200, "Nota depășește 200 de caractere.").optional(),
      }),
    )
    .min(
      CAUSE.MIN_DOCUMENTS,
      "Cauza nu poate fi aprobată fără cel puțin un document justificativ.",
    )
    .max(CAUSE.MAX_DOCUMENTS, `Maximum ${CAUSE.MAX_DOCUMENTS} documente.`),
});

const goalStep = z.object({
  goal: z.object({
    amountLei: z
      .string()
      .trim()
      .refine((value) => parseLeiInput(value) !== null, {
        error: "Introdu o sumă validă, în lei.",
      })
      .refine((value) => (parseLeiInput(value) ?? 0) >= CAUSE.MIN_GOAL, {
        error: `Obiectivul minim este ${CAUSE.MIN_GOAL / 100} lei.`,
      })
      .refine((value) => (parseLeiInput(value) ?? 0) <= CAUSE.MAX_GOAL, {
        error: `Obiectivul maxim este ${CAUSE.MAX_GOAL / 100} lei.`,
      }),
    deadline: z
      .string()
      .refine((value) => value === "" || Date.parse(value) > Date.now(), {
        error: "Termenul trebuie să fie în viitor.",
      }),
  }),
  payout: z.object({
    iban,
    stripeOnboarded: z.literal(true, {
      error: "Conectează contul de încasare pentru a putea primi fonduri.",
    }),
  }),
});

function consentsStep(type: BeneficiaryType) {
  return z.object({
    consents: z.object({
      truthfulness: z.literal(true, {
        error: "Confirmă că informațiile și documentele sunt reale.",
      }),
      controlledRelease: z.literal(true, {
        error: "Acordul privind eliberarea controlată a fondurilor este obligatoriu.",
      }),
      terms: z.literal(true, {
        error: "Acceptarea termenilor și a politicii de confidențialitate este obligatorie.",
      }),
      guardianAuthority:
        type === "MINOR"
          ? z.literal(true, {
              error: "Confirmă că ești tutorele legal al minorului.",
            })
          : z.boolean(),
    }),
  });
}

export type StepErrors = Record<string, string>;

function collect(issues: z.core.$ZodIssue[]): StepErrors {
  const errors: StepErrors = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function validateStep(
  step: number,
  draft: CauseApplicationDraft,
): StepErrors {
  const type = draft.beneficiaryType;

  const schema = (() => {
    switch (STEPS[step]?.id) {
      case "type":
        return typeStep;
      case "beneficiary":
        return type ? beneficiaryStep(type) : typeStep;
      case "story":
        return storyStep;
      case "evidence":
        return evidenceStep;
      case "goal":
        return goalStep;
      case "consents":
        return type ? consentsStep(type) : typeStep;
      default:
        return null;
    }
  })();

  if (!schema) return {};
  const result = schema.safeParse(draft);
  return result.success ? {} : collect(result.error.issues);
}

export function validateAll(draft: CauseApplicationDraft): StepErrors {
  return STEPS.slice(0, -1).reduce<StepErrors>(
    (all, _step, index) => ({ ...all, ...validateStep(index, draft) }),
    {},
  );
}

export function firstInvalidStep(draft: CauseApplicationDraft): number | null {
  for (let index = 0; index < STEPS.length - 1; index += 1) {
    if (Object.keys(validateStep(index, draft)).length > 0) return index;
  }
  return null;
}

export function toPayload(
  draft: CauseApplicationDraft,
): CauseApplicationPayload {
  const type = draft.beneficiaryType ?? "INDIVIDUAL";

  return {
    beneficiaryType: type,
    beneficiary: {
      fullName: draft.beneficiary.fullName.trim(),
      idDocumentRef: draft.beneficiary.idDocument,
      contactEmail: draft.beneficiary.contactEmail.trim(),
      contactPhone: draft.beneficiary.contactPhone.trim(),
      county: draft.beneficiary.county.trim(),
      city: draft.beneficiary.city.trim(),
      age:
        type === "MINOR" && draft.beneficiary.age
          ? Number(draft.beneficiary.age)
          : undefined,
    },
    guardian:
      type === "MINOR" && draft.guardian.relationToMinor
        ? {
            fullName: draft.guardian.fullName.trim(),
            idDocumentRef: draft.guardian.idDocument,
            relationToMinor: draft.guardian.relationToMinor,
            guardianshipProofRef: draft.guardian.guardianshipProof,
            phone: draft.guardian.phone.trim(),
          }
        : undefined,
    ngo:
      type === "NGO"
        ? {
            legalName: draft.ngo.legalName.trim(),
            registrationNumber: draft.ngo.registrationNumber.trim().toUpperCase(),
            statuteDocRef: draft.ngo.statuteDoc,
            representativeName: draft.ngo.representativeName.trim(),
            representativeIdRef: draft.ngo.representativeId,
          }
        : undefined,

    name: draft.story.name.trim(),
    shortDescription: draft.story.shortDescription.trim(),
    story: draft.story.story.trim(),
    category: (draft.story.category || "medical") as CauseApplicationPayload["category"],
    location: draft.story.location.trim(),
    coverImage: draft.story.coverImage,
    gallery: draft.story.gallery,

    documents: draft.documents
      .filter((document) => document.file && document.type)
      .map((document) => ({
        type: document.type as Exclude<typeof document.type, "">,
        fileName: document.file!.fileName,
        fileRef: document.file!.fileRef,
        note: document.note.trim() || undefined,
      })),

    goalAmount: parseLeiInput(draft.goal.amountLei) ?? 0,
    deadline: draft.goal.deadline
      ? new Date(draft.goal.deadline).toISOString()
      : undefined,
    payout: {
      method: type === "NGO" ? "STRIPE_NGO" : "STRIPE_INDIVIDUAL",
      iban: draft.payout.iban.replace(/\s/g, "").toUpperCase(),
      stripeOnboarded: draft.payout.stripeOnboarded,
    },
    consents: {
      truthfulness: draft.consents.truthfulness,
      controlledRelease: draft.consents.controlledRelease,
      terms: draft.consents.terms,
      guardianAuthority:
        type === "MINOR" ? draft.consents.guardianAuthority : undefined,
    },
  };
}
