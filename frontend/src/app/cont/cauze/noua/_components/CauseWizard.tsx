"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Alert, Button, Skeleton, Stepper, useToast } from "@/components/ui";
import {
  createCause,
  discardCauseDraft,
  getMyCauseDraft,
  saveDraftCause,
} from "@/lib/api/causes";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/hooks/useApi";
import type { CauseApplicationDraft, CauseDetail } from "@/lib/types";

import {
  EMPTY_DRAFT,
  STEPS,
  firstInvalidStep,
  toPayload,
  validateAll,
  validateStep,
  type StepErrors,
} from "./schema";
import { StepBeneficiary } from "./StepBeneficiary";
import { StepConsents } from "./StepConsents";
import { StepEvidence } from "./StepEvidence";
import { StepGoal } from "./StepGoal";
import { StepStory } from "./StepStory";
import { StepSummary } from "./StepSummary";
import { StepType } from "./StepType";
import { SubmittedScreen } from "./SubmittedScreen";

export interface StepProps {
  draft: CauseApplicationDraft;
  set: (updater: (draft: CauseApplicationDraft) => CauseApplicationDraft) => void;
  errors: StepErrors;
}

type SaveState = "idle" | "saving" | "saved";

export function CauseWizard() {
  const { user } = useAuth();
  const toast = useToast();

  const [draft, setDraft] = useState<CauseApplicationDraft>(EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [loading, setLoading] = useState(true);
  const [resumed, setResumed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CauseDetail | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  /* --- resume ---------------------------------------------------------- */

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const restore = async () => {
      try {
        const record = await getMyCauseDraft(user.id);
        if (cancelled) return;
        if (record) {
          setDraft(record.data);
          setStep(record.step);
          setFurthest(record.step);
          setResumed(true);
        }
      } catch {
        // A draft that will not load is not worth blocking a new one.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* --- draft, saved between steps rather than on every keystroke -------- */

  const persist = useCallback(
    async (next: CauseApplicationDraft, reached: number) => {
      if (!user) return;
      setSaveState("saving");
      try {
        await saveDraftCause(next, reached, user.id);
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    },
    [user],
  );

  // Steps save on the way out, but a tab closed mid-sentence should not cost
  // the sentence, so typing settles into a save too.
  useEffect(() => {
    if (loading || !user) return;
    const timeout = window.setTimeout(() => {
      void persist(draft, furthest);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [draft, furthest, loading, user, persist]);

  const set = useCallback(
    (updater: (current: CauseApplicationDraft) => CauseApplicationDraft) => {
      setDraft((current) => updater(current));
      setSaveState("idle");
    },
    [],
  );

  const goTo = (index: number) => {
    setStep(index);
    setErrors({});
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const back = () => goTo(Math.max(0, step - 1));

  const next = () => {
    const found = validateStep(step, draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      topRef.current?.scrollIntoView({ block: "start" });
      return;
    }
    const reached = Math.max(furthest, step + 1);
    setFurthest(reached);
    void persist(draft, reached);
    goTo(step + 1);
  };

  const submit = async () => {
    if (!user) return;
    const found = validateAll(draft);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const invalid = firstInvalidStep(draft);
      if (invalid !== null) goTo(invalid);
      toast.error(
        "Mai lipsește ceva",
        "Am marcat câmpurile care necesită atenție.",
      );
      return;
    }

    setFailure(null);
    setPending(true);
    try {
      const cause = await createCause(toPayload(draft), user.id, true);
      await discardCauseDraft(user.id);
      setSubmitted(cause);
    } catch (error) {
      setFailure(errorMessage(error));
      setPending(false);
    }
  };

  const startOver = async () => {
    if (!user) return;
    await discardCauseDraft(user.id);
    setDraft(EMPTY_DRAFT);
    setStep(0);
    setFurthest(0);
    setErrors({});
    setResumed(false);
  };

  if (submitted) return <SubmittedScreen cause={submitted} />;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-[26rem] w-full rounded-3xl" />
      </div>
    );
  }

  const stepProps: StepProps = { draft, set, errors };
  const isSummary = step === STEPS.length - 1;

  return (
    <div ref={topRef} className="flex flex-col gap-5 scroll-mt-20">
      <Stepper
        steps={[...STEPS]}
        current={step}
        furthest={furthest}
        onJump={goTo}
      />

      {resumed ? (
        <Alert
          tone="sky"
          title="Am păstrat ce ai completat"
          action={
            <Button variant="ghost" size="sm" onClick={startOver}>
              Începe de la zero
            </Button>
          }
        >
          Poți continua de unde ai rămas. Nimic nu se trimite fără confirmarea ta.
        </Alert>
      ) : null}

      {failure ? (
        <Alert tone="danger" title="Nu am putut trimite cauza">
          {failure}
        </Alert>
      ) : null}

      <div className="rounded-3xl bg-white ring-1 ring-edge p-5 sm:p-6">
        {step === 0 ? <StepType {...stepProps} /> : null}
        {step === 1 ? <StepBeneficiary {...stepProps} /> : null}
        {step === 2 ? <StepStory {...stepProps} /> : null}
        {step === 3 ? <StepEvidence {...stepProps} /> : null}
        {step === 4 ? <StepGoal {...stepProps} /> : null}
        {step === 5 ? <StepConsents {...stepProps} /> : null}
        {step === 6 ? <StepSummary {...stepProps} onEdit={goTo} /> : null}
      </div>

      <div className="flex items-center gap-2.5">
        {step > 0 ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={back}
            leftIcon={
              <Icons.crumb aria-hidden="true" className="h-4 w-4 rotate-180" />
            }
          >
            Înapoi
          </Button>
        ) : null}

        <span className="ml-auto inline-flex items-center gap-2">
          {saveState === "saved" ? (
            <span className="hidden items-center gap-1.5 text-xs font-bold text-ink-500 sm:inline-flex">
              <Icons.check aria-hidden="true" className="h-3.5 w-3.5" />
              Salvat
            </span>
          ) : null}

          {isSummary ? (
            <Button size="lg" onClick={submit} loading={pending}>
              Trimite spre verificare
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={next}
              rightIcon={
                <Icons.forward aria-hidden="true" className="h-4 w-4" />
              }
            >
              Continuă
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
