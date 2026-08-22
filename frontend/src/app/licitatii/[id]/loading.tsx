import { SkeletonDetail } from "@/components/ui";
import { PageTransition } from "@/components/layout/PageTransition";

export default function Loading() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <SkeletonDetail />
      </main>
    </PageTransition>
  );
}
