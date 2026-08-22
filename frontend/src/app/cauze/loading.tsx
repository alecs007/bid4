import { PageTransition } from "@/components/layout/PageTransition";
import { CauseBrowserSkeleton } from "./_components/CauseBrowserSkeleton";

export default function Loading() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="mb-4 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Cauze
        </h1>
        <CauseBrowserSkeleton />
      </main>
    </PageTransition>
  );
}
