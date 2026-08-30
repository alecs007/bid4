import Image from "next/image";

import { cn } from "@/lib/utils/cn";

/**
 * One of the small drawings, at the size the layout asks for.
 *
 * <p>Eager, everywhere. These are chips, menu rows and headings, not
 * photographs: lazy by default they arrived after the pictures they sit beside,
 * and until they did the filters read as a row of unlabelled blanks. `priority`
 * is deprecated from Next 16, so it is `loading` plus a `fetchPriority` hint.
 *
 * <p>Every file is held at 128px on its long side with the same encoding, so one
 * of these costs about five kilobytes wherever it appears.
 */
export function Illustration({
  src,
  className,
  sizes = "16px",
  alt = "",
}: {
  /** Path under `/images/illustrations`, without the extension. */
  src: string;
  /** Sizes the box the drawing fills, e.g. `h-4 w-4`. */
  className?: string;
  /** What width it actually renders at, for the browser to pick against. */
  sizes?: string;
  /** Empty, and hidden, unless the drawing says something the text does not. */
  alt?: string;
}) {
  return (
    <span
      aria-hidden={alt ? undefined : "true"}
      className={cn("relative block shrink-0 overflow-hidden", className)}
    >
      <Image
        src={`/images/illustrations/${src}.webp`}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        loading="eager"
        fetchPriority="high"
        // A hair of overscan: the art is drawn with a transparent margin, and
        // without this it reads a size smaller than the text beside it.
        className="scale-[1.04] object-contain"
        draggable={false}
      />
    </span>
  );
}

/**
 * Which taxonomy the icon belongs to, which is also where the file lives.
 * Auction categories and cause categories are drawn in the same hand and used
 * the same way, so they get one component rather than two.
 */
export type IconSet = "categories" | "causes";

/** The little drawing that labels a category or a cause. */
export function CategoryIcon({
  set,
  id,
  ...rest
}: {
  set: IconSet;
  id: string;
  className?: string;
  sizes?: string;
  alt?: string;
}) {
  return <Illustration src={`${set}/${id}`} {...rest} />;
}
