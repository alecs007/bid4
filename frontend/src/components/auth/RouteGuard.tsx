"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { withRedirect } from "@/lib/auth/form";
import type { UserRole } from "@/lib/types";
import { Button, ButtonLink, EmptyState } from "@/components/ui";

export function RouteGuard({
  children,
  roles,
  redirectTo = "/autentificare",
}: {
  children: ReactNode;
  roles?: UserRole[];
  redirectTo?: string;
}) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = user !== null && (!roles || roles.includes(user.role));
  const signIn = withRedirect(redirectTo, pathname);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(signIn);
    }
  }, [status, router, signIn]);

  // Rendered, not replaced, while the session is still being restored. This
  // used to draw three stat boxes over the whole account area — a placeholder
  // for no page in particular, shown before the page then drew its own. A page
  // knows what it is about to look like and this does not, so it waits here and
  // lets the page say so. Everything under it already treats a missing user as
  // "not ready" rather than "nobody".
  if (status === "loading") {
    return <>{children}</>;
  }

  if (status === "anonymous") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <EmptyState
          mood="thinking"
          title="Trebuie să fii autentificat"
          description="Intră în cont ca să continui."
          action={<ButtonLink href={signIn}>Autentifică-te</ButtonLink>}
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

export function RequireUser({ children }: { children: ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}

export function RequireOperator({ children }: { children: ReactNode }) {
  return <RouteGuard roles={["OPERATOR", "ADMIN"]}>{children}</RouteGuard>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RouteGuard roles={["ADMIN"]}>{children}</RouteGuard>;
}

export function SignInPrompt({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white ring-1 ring-edge p-4">
      <p className="text-sm text-ink-700">{message}</p>
      <div className="flex gap-2">
        <Button
          onClick={() => router.push(withRedirect("/autentificare", pathname))}
        >
          Autentifică-te
        </Button>
        <ButtonLink
          href={withRedirect("/inregistrare", pathname)}
          variant="secondary"
        >
          Creează cont
        </ButtonLink>
      </div>
    </div>
  );
}
