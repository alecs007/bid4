"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { withRedirect } from "@/lib/auth/form";
import type { UserRole } from "@/lib/types";
import { Button, ButtonLink, EmptyState, SkeletonStats } from "@/components/ui";

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
