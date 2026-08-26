import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui";

/** Matches the checking state box for box, so nothing moves when it resolves. */
export function ConfirmEmailSkeleton() {
  return (
    <AuthShell
      mood="thinking"
      title="Confirmăm adresa"
      description="Durează doar o clipă."
    >
      <Skeleton className="h-11 w-full rounded-2xl" />
    </AuthShell>
  );
}
