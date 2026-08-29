"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Icons } from "@/components/icons";
import { Alert, Button, Field, Input, useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMAIL_PATTERN, safeRedirect } from "@/lib/auth/form";
import { errorMessage } from "@/lib/hooks/useApi";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, status } = useAuth();
  const toast = useToast();

  const destination = safeRedirect(params.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Nobody who is already signed in needs this page.
  useEffect(() => {
    if (status === "authenticated") router.replace(destination);
  }, [status, router, destination]);

  // TODO(backend): POST /auth/forgot-password — there is no reset flow yet, so
  // the link is left out rather than pointing nowhere.
  const arrive = (name: string) => {
    toast.success(`Bine ai venit, ${name.split(" ")[0]}!`);
    router.replace(destination);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const found: typeof errors = {};
    if (!email.trim()) found.email = "Introdu adresa de email.";
    else if (!EMAIL_PATTERN.test(email.trim()))
      found.email = "Adresa de email nu pare validă.";
    if (!password) found.password = "Introdu parola.";

    setErrors(found);
    if (found.email || found.password) return;

    setFailure(null);
    setPending(true);
    try {
      const user = await login({ email: email.trim(), password });
      arrive(user.displayName);
    } catch (error) {
      setFailure(errorMessage(error));
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Bine ai venit!"
      description="Intră în cont pentru a continua seria faptelor bune."
      footer={
        <>
          Nu ai încă un cont?{" "}
          <Link
            href="/inregistrare"
            className="font-bold text-primary-700 underline underline-offset-4"
          >
            Creează unul
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure ? (
          <Alert tone="danger" title="Nu am putut intra în cont">
            {failure}
          </Alert>
        ) : null}

        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nume@exemplu.ro"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            leading={<Icons.email aria-hidden="true" className="h-4 w-4 shrink-0" />}
          />
        </Field>

        <Field label="Parolă" error={errors.password}>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="Parola ta"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Intră în cont
        </Button>
      </form>
    </AuthShell>
  );
}
