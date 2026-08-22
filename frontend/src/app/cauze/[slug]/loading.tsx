import { SkeletonCauseDetail } from "@/components/ui";
import { PageTransition } from "@/components/layout/PageTransition";

export default function Loading() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <SkeletonCauseDetail />
      </main>
    </PageTransition>
  );
}
