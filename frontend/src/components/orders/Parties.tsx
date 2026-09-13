import { Avatar, type AvatarSize } from "@/components/ui";
import type { OrderParty } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Who the sale is between.
 *
 * <p>The two people, with their own faces, and no arrow between them. An arrow reads as a direction
 * of travel and invites the question which way — but a sale has two directions at once, the parcel
 * one way and the money the other, so the mark was answering a question nobody asked and answering
 * it by halves.
 *
 * <p>Neither side is marked as the reader. A record does not change depending on who opens it, and
 * highlighting one half in green made the reader's own row look like a status — something had gone
 * right about that person — when all it meant was "this is you", which they know.
 */
export function Parties({
  seller,
  buyer,
  size = "sm",
  className,
}: {
  seller: OrderParty | null;
  buyer: OrderParty | null;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-stretch gap-2", className)}>
      <Party role="Vânzător" person={seller} size={size} />
      <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-line" />
      <Party role="Cumpărător" person={buyer} size={size} />
    </div>
  );
}

/**
 * One party, or the shape of one.
 *
 * <p>An account can be closed after a sale, which does not invalidate the order — so a missing side
 * keeps its row and says so, rather than collapsing the pair and leaving the remaining name
 * looking like it belongs to whichever role happens to be first.
 */
function Party({
  role,
  person,
  size,
}: {
  role: string;
  person: OrderParty | null;
  size: AvatarSize;
}) {
  if (!person) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar name="?" size={size} />
        <div className="min-w-0">
          <p className="text-[11px] leading-tight font-bold text-ink-500">{role}</p>
          <p className="truncate text-[13px] leading-tight font-bold text-ink-500">
            Cont indisponibil
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Avatar
        name={person.displayName}
        src={person.avatarUrl}
        size={size}
        accountType={person.accountType}
        verified={person.verified}
      />
      <div className="min-w-0">
        <p className="text-[11px] leading-tight font-bold text-ink-500">{role}</p>
        <p className="truncate text-[13px] leading-tight font-bold text-ink-900">
          {person.displayName}
        </p>
      </div>
    </div>
  );
}
