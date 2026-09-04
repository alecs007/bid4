/**
 * The page's name, on a strip stuck under the site header.
 *
 * <p>A heading at the top of a long list is gone by the second screen, and these are pages people
 * scroll a long way down. Kept here it is the one thing on screen that says where they are.
 *
 * <p>Opaque, not frosted: content sliding under a translucent bar is legible enough to read and
 * not legible enough to ignore, and the title is the thing that has to stay readable.
 */

export function PageTitle({ children }: { children: string }) {
  return (
    <div className="sticky top-12 z-30 flex h-10 items-center justify-center border-b border-line bg-white sm:top-14">
      <h1 className="font-display text-sm font-extrabold text-ink-900">
        {children}
      </h1>
    </div>
  );
}
