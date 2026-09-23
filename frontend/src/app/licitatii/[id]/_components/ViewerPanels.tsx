"use client";

import { Icons } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { listOrders } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { isCommitted } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { countRo } from "@/lib/utils/plural";

export type Stance =
  | "seller"
  | "buyer"
  | "accepted"
  | "guest"
  | "leading"
  | "outbid"
  | "visitor";

export function stanceOf(auction: AuctionDetail, viewerId?: string): Stance {
  if (viewerId && viewerId === auction.sellerId) return "seller";
  if (viewerId && auction.winnerId && viewerId === auction.winnerId) {
    return "buyer";
  }
  if (!viewerId) return "guest";
  if (auction.viewerBidStatus === "ACCEPTED") return "accepted";
  if (auction.viewerBidStatus === "WINNING") return "leading";
  if (auction.viewerBidStatus === "OUTBID") return "outbid";
  return "visitor";
}

export function hasOffer(stance: Stance): boolean {
  return stance === "leading" || stance === "outbid" || stance === "accepted";
}

export function useOrderHref(auction: AuctionDetail, stance: Stance): string {
  const { user } = useAuth();
  const role =
    stance === "seller" ? "SELLER" : stance === "buyer" ? "BUYER" : null;
  const enabled = Boolean(user && role && isCommitted(auction.status));

  const { data } = useApi(
    () => listOrders(user!.id, { role: role! }),
    `auction-order:${auction.id}:${role}:${user?.id}`,
    { enabled },
  );

  const order = data?.find((item) => item.auction?.id === auction.id);
  return order ? `/cont/comenzi/${order.id}` : "/cont/comenzi";
}

const TONES = {
  sky: "bg-sky-50 text-sky-800",
  success: "bg-success-50 text-success-700",
  sun: "bg-sun-50 text-sun-800",
  neutral: "bg-ink-50 text-ink-800",
} as const;

const ICONS = {
  sky: Icons.success,
  success: Icons.success,
  sun: Icons.warning,
  neutral: Icons.info,
} as const;

export function Notice({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm leading-snug font-bold",
        TONES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

export function ConversationButton({
  auction,
  label,
  variant = "primary",
  withIcon = false,
}: {
  auction: AuctionDetail;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  withIcon?: boolean;
}) {
  return (
    <ButtonLink
      href={`/cont/inbox/nou/${auction.id}`}
      size="lg"
      fullWidth
      variant={variant}
      leftIcon={
        withIcon ? (
          <Icons.inbox aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
        ) : undefined
      }
    >
      {label}
    </ButtonLink>
  );
}

export function PriceBlock({
  auction,
  second,
}: {
  auction: AuctionDetail;
  second?: { label: string; value: number };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-ink-500">Preț de pornire</p>
        <p
          className={cn(
            "numeric font-display leading-none font-extrabold",
            second ? "text-2xl text-ink-900" : "text-3xl text-accent-700",
          )}
        >
          {formatMoney(auction.startingPrice, { compact: true })}
        </p>
      </div>
      {second ? (
        <div className="min-w-0 text-right">
          <p className="text-sm text-ink-500">{second.label}</p>
          <p className="numeric font-display text-2xl leading-none font-extrabold text-accent-700">
            {formatMoney(second.value, { compact: true })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 px-5 py-5">{children}</div>;
}

export function SellerPanel({
  auction,
  acceptedCount = 0,
}: {
  auction: AuctionDetail;
  acceptedCount?: number;
}) {
  const orderHref = useOrderHref(auction, "seller");
  const settled = auction.acceptedAmount ?? auction.currentPrice;

  if (auction.status === "DRAFT" || auction.status === "PENDING_REVIEW") {
    return (
      <Shell>
        <Notice tone={auction.status === "DRAFT" ? "neutral" : "sun"}>
          {auction.status === "DRAFT"
            ? "Anunțul este o ciornă și nu este public."
            : "Anunțul este în verificare la echipa bid4."}
        </Notice>
        <PriceBlock auction={auction} />
        <ButtonLink href="/cont/vanzari" variant="secondary" fullWidth>
          Mergi la vânzările mele
        </ButtonLink>
      </Shell>
    );
  }

  if (auction.status === "CANCELLED") {
    return (
      <Shell>
        <Notice tone="neutral">Ai retras acest anunț.</Notice>
        <PriceBlock auction={auction} />
        <ButtonLink href="/cont/vanzari" variant="secondary" fullWidth>
          Mergi la vânzările mele
        </ButtonLink>
      </Shell>
    );
  }

  if (isCommitted(auction.status)) {
    const sold = auction.status === "SOLD";
    return (
      <Shell>
        <Notice tone={sold ? "success" : "sky"}>
          {sold ? "Produsul a fost vândut." : "Ai acceptat o ofertă."}
        </Notice>
        <PriceBlock
          auction={auction}
          second={{
            label: sold ? "Preț de vânzare" : "Oferta acceptată",
            value: settled,
          }}
        />
        <ButtonLink href={orderHref} size="lg" fullWidth>
          Vezi comanda
        </ButtonLink>
      </Shell>
    );
  }

  return (
    <Shell>
      {acceptedCount > 0 ? (
        <Notice tone="sky">
          Ai acceptat {countRo(acceptedCount, "ofertă", "oferte")}.
        </Notice>
      ) : null}
      <PriceBlock
        auction={auction}
        second={
          auction.bidCount > 0
            ? { label: "Cea mai mare ofertă", value: auction.currentPrice }
            : undefined
        }
      />
      <ButtonLink href="/cont/vanzari" size="lg" fullWidth>
        Gestionează anunțul
      </ButtonLink>
    </Shell>
  );
}

export function BuyerPanel({ auction }: { auction: AuctionDetail }) {
  const orderHref = useOrderHref(auction, "buyer");
  const settled = auction.acceptedAmount ?? auction.currentPrice;
  const sold = auction.status === "SOLD";

  return (
    <Shell>
      <Notice tone={sold ? "success" : "sky"}>
        {sold ? "Ai cumpărat acest produs." : "Oferta ta a fost acceptată."}
      </Notice>
      <PriceBlock
        auction={auction}
        second={{
          label: sold ? "Preț plătit" : "Oferta acceptată",
          value: settled,
        }}
      />
      {sold ? (
        <ButtonLink href={orderHref} size="lg" fullWidth>
          Vezi comanda
        </ButtonLink>
      ) : (
        <ConversationButton auction={auction} label="Finalizează comanda" />
      )}
    </Shell>
  );
}

export function AcceptedPanel({ auction }: { auction: AuctionDetail }) {
  return (
    <Shell>
      <Notice tone="sky">
        Oferta ta a fost acceptată. Plătește pentru a cumpăra produsul.
      </Notice>
      <PriceBlock
        auction={auction}
        second={
          auction.viewerBidAmount
            ? { label: "Oferta ta", value: auction.viewerBidAmount }
            : undefined
        }
      />
      <ConversationButton auction={auction} label="Finalizează comanda" />
    </Shell>
  );
}

export function OutcomePanel({
  auction,
  stance,
}: {
  auction: AuctionDetail;
  stance: Stance;
}) {
  const offered = hasOffer(stance);

  if (auction.status === "SOLD") {
    const settled = auction.acceptedAmount ?? auction.currentPrice;
    return (
      <Shell>
        <Notice tone="success">
          {offered
            ? "Produsul a fost vândut altui cumpărător."
            : "Produsul a fost vândut."}
        </Notice>
        <PriceBlock
          auction={auction}
          second={{ label: "Preț final", value: settled }}
        />
        <ButtonLink href="/licitatii" variant="secondary" fullWidth>
          Vezi alte licitații
        </ButtonLink>
      </Shell>
    );
  }

  return (
    <Shell>
      <Notice tone="neutral">
        {auction.status === "CANCELLED"
          ? "Anunțul a fost retras de vânzător."
          : "Anunțul nu este public."}
      </Notice>
      <PriceBlock auction={auction} />
      <ButtonLink href="/licitatii" variant="secondary" fullWidth>
        Vezi alte licitații
      </ButtonLink>
    </Shell>
  );
}
