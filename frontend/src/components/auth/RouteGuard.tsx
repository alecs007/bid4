"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { UserRole } from "@/lib/types";
import { Button, ButtonLink, EmptyState, SkeletonStats } from "@/components/ui";

/**
 * Client-side route protection.
 *
 * TODO(backend): this is a UX guard, not a security boundary — the real
 * enforcement is Spring Security on every endpoint. Once middleware can read
 * the JWT cookie, add a `proxy.ts` matcher for `/cont`, `/operator` and
 * `/admin` so unauthorised users never even get the HTML.
 */
export function RouteGuard({
  children,
  roles,
  /** Where to send anonymous visitors. */
  redirectTo = "/autentificare",
}: {
  children: ReactNode;
  /** Omit to require only that someone is signed in. */
  roles?: UserRole[];
  redirectTo?: string;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  const allowed = user !== null && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <SkeletonStats count={3} />
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <EmptyState
          mood="thinking"
          title="Trebuie să fii autentificat"
          description="Intră în cont ca să continui."
          action={<ButtonLink href={redirectTo}>Autentifică-te</ButtonLink>}
        />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <EmptyState
          mood="sad"
          title="Nu ai acces la această zonă"
          description={
            roles?.includes("ADMIN") && !roles.includes("OPERATOR")
              ? "Secțiunea este rezervată administratorilor platformei."
              : "Secțiunea este rezervată echipei bid4."
          }
          action={<ButtonLink href="/">Înapoi la pagina principală</ButtonLink>}
        />
      </div>
    );
  }

  return <>{children}</>;
}

/** Any signed-in user. */
export function RequireUser({ children }: { children: ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}

/** Staff moderation area: OPERATOR and ADMIN. */
export function RequireOperator({ children }: { children: ReactNode }) {
  return <RouteGuard roles={["OPERATOR", "ADMIN"]}>{children}</RouteGuard>;
}

/** Platform administration: ADMIN only. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RouteGuard roles={["ADMIN"]}>{children}</RouteGuard>;
}

/** Inline sign-in prompt for actions that need an account. */
export function SignInPrompt({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-sm text-ink-700">{message}</p>
      <div className="flex gap-2">
        <Button onClick={() => router.push("/autentificare")}>
          Autentifică-te
        </Button>
        <ButtonLink href="/inregistrare" variant="secondary">
          Creează cont
        </ButtonLink>
      </div>
    </div>
  );
}
