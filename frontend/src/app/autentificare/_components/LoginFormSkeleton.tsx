import { AuthFieldsSkeleton, AuthShell } from "@/components/auth/AuthShell";

export function LoginFormSkeleton() {
  return (
    <AuthShell
      title="Bine ai revenit"
      description="Intră în cont pentru a licita, a vinde și a urmări cauzele pe care le susții."
    >
      <AuthFieldsSkeleton fields={2} />
    </AuthShell>
  );
}
