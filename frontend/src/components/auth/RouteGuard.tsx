"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { withRedirect } from "@/lib/auth/form";
import { useWasSignedIn } from "@/lib/auth/session-hint";
import type { UserRole } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui";

function Hold() {
  return <div aria-busy="true" className="min-h-[70vh]" />;
}

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

  const wasSignedIn = useWasSignedIn();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") {
      router.replace(signIn);
      return;
    }
    if (!allowed) router.replace("/");
  }, [status, allowed, router, signIn]);

  if (status === "loading" && wasSignedIn) return <>{children}</>;
  if (status !== "authenticated" || !allowed) return <Hold />;

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
