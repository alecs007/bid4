import { AuthShell } from "@/components/auth/AuthShell";
import { Skeleton } from "@/components/ui";

export function RegisterFormSkeleton() {
  return (
    <AuthShell
      mood="cheer"
      title="Creează-ți contul"
      description="Un singur cont pentru tot: licitezi, vinzi și poți deschide o cauză."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-[74px] w-full rounded-2xl" />
            <Skeleton className="h-[74px] w-full rounded-2xl" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>

        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-13 w-full rounded-2xl" />
      </div>
    </AuthShell>
  );
}
