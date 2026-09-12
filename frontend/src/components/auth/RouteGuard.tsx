"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { withRedirect } from "@/lib/auth/form";
import { useWasSignedIn } from "@/lib/auth/session-hint";
import type { UserRole } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui";

/**
 * Nothing, at the height of a page.
 *
 * <p>What stands here while the answer is unknown, and while the browser is on its way somewhere
 * else. Deliberately empty: a placeholder drawn for no page in particular is furniture from a screen
 * the reader may not be allowed to see, and the honest thing to show somebody who is about to be
 * redirected is nothing at all. The height is only so the footer does not ride up and drop back.
 */
function Hold() {
  return <div aria-busy="true" className="min-h-[70vh]" />;
}

/**
 * Who may be here, decided before anything under it renders.
 *
 * <p>The rule is that `children` mount only once the session is known and allowed. That is stricter
 * than it looks: this used to render the page while the session was still being restored, so a
 * signed-out visitor got the private screen — laid out, fetching, briefly readable — and only then
 * the redirect. It is not a data leak, because every request under it is refused without a token,
 * but it is the page, and being shown a page one has no business on is the complaint.
 *
 * <p>Whose page it is, though, is usually known before the request that confirms it: a blocking
 * script writes `data-session` on the document from what happened last time. Where that says
 * somebody was signed in, the page is drawn while the answer is fetched — it shows its own skeleton
 * at its own height, instead of a blank that pulls the footer up the screen and drops it again when
 * the content lands. Where it says signed out, nothing is drawn at all.
 *
 * <p>A wrong guess costs a stranger the sight of an empty skeleton, which is furniture; every
 * request under it is refused without a token, and the redirect follows a moment later.
 *
 * <p>Not a security control either way — `middleware.ts` turns most of these away before the page is
 * served, and the API authorises every request for itself. This is what makes the two agree in the
 * browser, and what covers the mock build, where there is no cookie for the middleware to read.
 */
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
    // Signed out: to the sign-in page, carrying where they were going.
    if (status === "anonymous") {
      router.replace(signIn);
      return;
    }
    // Signed in as somebody without the role. Home rather than an explanation:
    // whether a staff area exists is not something an ordinary account needs
    // confirmed, which is the same answer the middleware gives.
    if (!allowed) router.replace("/");
  }, [status, allowed, router, signIn]);

  // Still asking, but the last visit says whose page this is: draw it, so the
  // restore is spent on the page's own skeleton rather than on a blank.
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
