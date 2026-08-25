"use client";

import { Alert, Field, FileUpload, FileUploadGrid, Input, Select, Textarea } from "@/components/ui";
import { CAUSE, CAUSE_CATEGORIES, type CauseCategoryId } from "@/lib/config";
import type { UploadedFileRef } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

import type { StepProps } from "./CauseWizard";
import { StepHeader } from "./StepHeader";

const CATEGORY_OPTIONS = CAUSE_CATEGORIES.map((category) => ({
  value: category.id,
  label: `${category.emoji} ${category.label}`,
}));

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={cn(
        "numeric text-xs font-bold",
        value > max ? "text-danger-600" : "text-ink-500",
      )}
    >
      {value} / {max}
    </span>
  );
}

export function StepStory({ draft, set, errors }: StepProps) {
  const setStory = (patch: Partial<typeof draft.story>) =>
    set((current) => ({ ...current, story: { ...current.story, ...patch } }));

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title="Povestea cauzei"
        lead="Scrie firesc și concret: cine este beneficiarul, ce s-a întâmplat și la ce vor fi folosite fondurile."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Titlu"
          required
          error={errors["story.name"]}
          hint="Scurt și clar. Apare pe fiecare licitație legată de cauză."
          className="sm:col-span-2"
        >
          <Input
            value={draft.story.name}
            onChange={(event) => setStory({ name: event.target.value })}
            placeholder="Un an de tratament pentru Ana"
            maxLength={80}
          />
        </Field>

        <Field label="Categorie" required error={errors["story.category"]}>
          <Select
            value={draft.story.category}
            options={CATEGORY_OPTIONS}
            onChange={(category) =>
              setStory({ category: category as CauseCategoryId | "" })
            }
            ariaLabel="Categoria cauzei"
            placeholder="Alege categoria"
          />
        </Field>

        <Field
          label="Unde se întâmplă"
          required
          error={errors["story.location"]}
          hint="Oraș și județ."
        >
          <Input
            value={draft.story.location}
            onChange={(event) => setStory({ location: event.target.value })}
            placeholder="Cluj-Napoca, Cluj"
          />
        </Field>
      </div>

      <Field
        label="Descriere scurtă"
        required
        error={errors["story.shortDescription"]}
        hint="Una sau două propoziții. Apar pe carduri, înainte ca vizitatorul să deschidă cauza."
      >
        <div className="flex flex-col gap-1">
          <Textarea
            rows={2}
            value={draft.story.shortDescription}
            onChange={(event) =>
              setStory({ shortDescription: event.target.value })
            }
            placeholder="Ana are 7 ani și are nevoie de un an de recuperare după accident."
          />
          <span className="self-end">
            <Counter
              value={draft.story.shortDescription.length}
              max={CAUSE.SHORT_DESCRIPTION_MAX}
            />
          </span>
        </div>
      </Field>

      <Field
        label="Povestea completă"
        required
        error={errors["story.story"]}
        hint="Ce s-a întâmplat, unde vă aflați acum, ce urmează și cât costă. Sumele și datele verificabile conving mai mult decât adjectivele."
      >
        <div className="flex flex-col gap-1">
          <Textarea
            rows={10}
            value={draft.story.story}
            onChange={(event) => setStory({ story: event.target.value })}
            placeholder="În martie, Ana a avut un accident…"
          />
          <span className="self-end">
            <Counter value={draft.story.story.length} max={CAUSE.STORY_MAX} />
          </span>
        </div>
      </Field>

      <FileUpload
        label="Imagine de copertă"
        hint="O fotografie reală și luminoasă. Evită imaginile preluate de pe internet."
        accept="image/*"
        required
        value={draft.story.coverImage}
        onChange={(file?: UploadedFileRef) => setStory({ coverImage: file })}
        error={errors["story.coverImage"]}
      />

      <FileUploadGrid
        label="Galerie"
        hint="Opțional. Câteva fotografii care arată situația sau rezultatele de până acum."
        values={draft.story.gallery}
        onChange={(gallery) => setStory({ gallery })}
      />

      <Alert tone="sun" title="Include doar ce poate fi dovedit">
        La pasul următor îți cerem documentele care susțin povestea. Dacă ceva
        de aici nu poate fi dovedit, mai bine nu îl scrie — operatorii resping
        cauzele care nu se potrivesc cu actele.
      </Alert>
    </div>
  );
}
