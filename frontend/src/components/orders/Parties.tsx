import { Avatar, type AvatarSize } from "@/components/ui";
import type { OrderParty } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

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
