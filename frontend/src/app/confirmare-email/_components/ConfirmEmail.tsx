"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { Alert, Button, ButtonLink, Field, Input, useToast } from "@/components/ui";
import { resendVerification, verifyEmail } from "@/lib/api/auth";
import { errorMessage } from "@/lib/hooks/useApi";

type State = "checking" | "confirmed" | "failed";

/**
 * Where the link in the confirmation message lands.
 *
 * The token is redeemed once, on arrival. The endpoint is idempotent, so a mail
 * client that prefetched the link has not spent it.
 */
export function ConfirmEmail() {
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<State>("checking");
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        if (!cancelled) {
          setFailure("Linkul este incomplet. Deschide-l direct din email.");
          setState("failed");
        }
        return;
      }
      try {
        await verifyEmail(token);
        if (!cancelled) setState("confirmed");
      } catch (error) {
        if (cancelled) return;
        setFailure(errorMessage(error));
        setState("failed");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "checking") {
    return (
      <AuthShell
        mood="thinking"
        title="Confirmăm adresa"
        description="Durează doar o clipă."
      >
        <div className="h-11 w-full animate-pulse rounded-2xl bg-ink-100" />
      </AuthShell>
    );
  }

  if (state === "confirmed") {
    return (
      <AuthShell
        mood="cheer"
        title="Adresa este confirmată"
        description="Contul tău este gata. Intră în cont ca să începi."
      >
        <ButtonLink href="/autentificare" size="lg" fullWidth>
          Intră în cont
        </ButtonLink>
      </AuthShell>
    );
  }

  return <ConfirmationFailed reason={failure} />;
}

/** A link that expired or was already replaced. The way out is a new one. */
function ConfirmationFailed({ reason }: { reason: string | null }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await resendVerification(email.trim());
      toast.success(
        "Am trimis un link nou",
        "Verifică inbox-ul, inclusiv folderul de spam.",
      );
    } catch (error) {
      toast.error("Nu am putut trimite linkul", errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      mood="sad"
      title="Linkul nu mai este valabil"
      description="Cere unul nou și îl trimitem imediat."
      footer={
        <>
          Ai confirmat deja?{" "}
          <Link
            href="/autentificare"
            className="font-bold text-primary-700 underline underline-offset-4"
          >
            Intră în cont
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {reason ? <Alert tone="warning">{reason}</Alert> : null}

        <Field label="Adresa de email" required>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nume@exemplu.ro"
          />
        </Field>

        <Button
          size="lg"
          fullWidth
          loading={sending}
          disabled={email.trim().length === 0}
          onClick={resend}
        >
          Trimite un link nou
        </Button>
      </div>
    </AuthShell>
  );
}
