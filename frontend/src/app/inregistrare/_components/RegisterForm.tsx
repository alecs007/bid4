"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Icons } from "@/components/icons";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  RadioCard,
  useToast,
} from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMAIL_PATTERN, safeRedirect } from "@/lib/auth/form";
import { ACCOUNT } from "@/lib/config";
import { errorMessage } from "@/lib/hooks/useApi";
import { ApiError, type AccountType } from "@/lib/types";

type FieldName =
  | "displayName"
  | "email"
  | "password"
  | "confirmPassword"
  | "orgLegalName"
  | "orgRegistrationNumber"
  | "acceptedTerms";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register, status } = useAuth();
  const toast = useToast();

  const destination = safeRedirect(params.get("redirect"));

  const [accountType, setAccountType] = useState<AccountType>("INDIVIDUAL");
  const [displayName, setDisplayName] = useState("");
  const [orgLegalName, setOrgLegalName] = useState("");
  const [orgRegistrationNumber, setOrgRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isOrganization = accountType === "ORGANIZATION";

  useEffect(() => {
    if (status === "authenticated") router.replace(destination);
  }, [status, router, destination]);

  const validate = () => {
    const found: Partial<Record<FieldName, string>> = {};

    if (displayName.trim().length < ACCOUNT.MIN_DISPLAY_NAME_LENGTH) {
      found.displayName = "Alege numele sub care vei apărea.";
    } else if (displayName.trim().length > ACCOUNT.MAX_DISPLAY_NAME_LENGTH) {
      found.displayName = `Cel mult ${ACCOUNT.MAX_DISPLAY_NAME_LENGTH} de caractere.`;
    }

    if (isOrganization) {
      if (!orgLegalName.trim()) {
        found.orgLegalName = "Completează denumirea legală a organizației.";
      }
      if (!orgRegistrationNumber.trim()) {
        found.orgRegistrationNumber = "Completează codul de înregistrare (CUI).";
      }
    }

    if (!email.trim()) {
      found.email = "Introdu adresa de email.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      found.email = "Adresa de email nu pare validă.";
    }

    if (password.length < ACCOUNT.MIN_PASSWORD_LENGTH) {
      found.password = `Parola are nevoie de cel puțin ${ACCOUNT.MIN_PASSWORD_LENGTH} caractere.`;
    }
    if (confirmPassword !== password) {
      found.confirmPassword = "Cele două parole nu sunt la fel.";
    }
    if (!acceptedTerms) {
      found.acceptedTerms = "Trebuie să accepți termenii ca să continui.";
    }

    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setFailure(null);
    setPending(true);
    try {
      const user = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        accountType,
        orgLegalName: isOrganization ? orgLegalName.trim() : undefined,
        orgRegistrationNumber: isOrganization
          ? orgRegistrationNumber.trim()
          : undefined,
        acceptedTerms,
      });
      toast.success(
        `Bine ai venit, ${user.displayName.split(" ")[0]}!`,
        "Adaugă un card și o adresă de livrare pentru a putea licita.",
      );
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_TAKEN") {
        setErrors({ email: error.message });
      } else {
        setFailure(errorMessage(error));
      }
      setPending(false);
    }
  };

  return (
    <AuthShell
      mood="cheer"
      title="Creează-ți contul"
      description="Un singur cont pentru tot: licitezi, vinzi și poți deschide o cauză."
      footer={
        <>
          Ai deja cont?{" "}
          <Link
            href="/autentificare"
            className="font-bold text-primary-700 underline underline-offset-4"
          >
            Intră în cont
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure ? (
          <Alert tone="danger" title="Nu am putut crea contul">
            {failure}
          </Alert>
        ) : null}

        <Field
          label="Tip de cont"
          hint="Ambele pot licita, vinde și propune cauze. Diferă doar documentele cerute la verificarea unei cauze."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <RadioCard
              name="accountType"
              value="INDIVIDUAL"
              checked={!isOrganization}
              onChange={() => setAccountType("INDIVIDUAL")}
              label="Persoană fizică"
              icon={<Icons.account aria-hidden="true" className="h-5 w-5" />}
            />
            <RadioCard
              name="accountType"
              value="ORGANIZATION"
              checked={isOrganization}
              onChange={() => setAccountType("ORGANIZATION")}
              label="Organizație"
              icon={
                <Icons.organization aria-hidden="true" className="h-5 w-5" />
              }
            />
          </div>
        </Field>

        <Field
          label="Nume afișat"
          error={errors.displayName}
          hint="Numele apare pe anunțuri, oferte și profil."
        >
          <Input
            name="displayName"
            autoComplete="name"
            placeholder={isOrganization ? "Asociația Zâmbet" : "Maria Ionescu"}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>

        {isOrganization ? (
          <>
            <Field label="Denumire legală" error={errors.orgLegalName}>
              <Input
                name="orgLegalName"
                placeholder="Asociația Zâmbet pentru Copii"
                value={orgLegalName}
                onChange={(event) => setOrgLegalName(event.target.value)}
              />
            </Field>
            <Field
              label="Cod de înregistrare"
              error={errors.orgRegistrationNumber}
            >
              <Input
                name="orgRegistrationNumber"
                placeholder="RO12345678"
                value={orgRegistrationNumber}
                onChange={(event) =>
                  setOrgRegistrationNumber(event.target.value)
                }
              />
            </Field>
          </>
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
            leading={<Icons.email aria-hidden="true" className="h-4 w-4" />}
          />
        </Field>

        <Field
          label="Parolă"
          error={errors.password}
          hint={`Cel puțin ${ACCOUNT.MIN_PASSWORD_LENGTH} caractere.`}
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field label="Confirmă parola" error={errors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <Checkbox
            name="acceptedTerms"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            label="Sunt de acord cu termenii și cu politica de confidențialitate."
            description="Plata rămâne protejată până confirmi coletul, iar donația pleacă spre cauză imediat după."
          />
          {errors.acceptedTerms ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-sm font-semibold text-danger-600"
            >
              <Icons.error className="h-4 w-4 shrink-0" aria-hidden="true" />
              {errors.acceptedTerms}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Creează contul
        </Button>
      </form>
    </AuthShell>
  );
}
