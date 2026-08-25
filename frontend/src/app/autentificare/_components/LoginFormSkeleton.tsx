import { AuthFieldsSkeleton, AuthShell } from "@/components/auth/AuthShell";

export function LoginFormSkeleton() {
  return (
    <AuthShell
      title="Bine ai revenit"
      description="Intră în cont ca să licitezi, să vinzi și să urmărești cauzele tale."
    >
      <AuthFieldsSkeleton fields={2} />
    </AuthShell>
  );
}
