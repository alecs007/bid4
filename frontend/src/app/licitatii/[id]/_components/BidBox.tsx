"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Button,
  ButtonLink,
  Checkbox,
  FeeBreakdown,
  Legal,
  Modal,
  Sheet,
  useToast,
} from "@/components/ui";
import {
  checkRetractEligibility,
  minimumBid,
  placeBid,
  retractBid,
} from "@/lib/api/bids";
import { AUCTION, ORDER, TERMS, type Bani } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";
import { computeFees, formatMoney, parseLeiInput } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { isCommitted, isOfferable } from "@/lib/types";
import { errorMessage } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils/cn";

import {
  AcceptedPanel,
  BuyerPanel,
  ConversationButton,
  Notice,
  OutcomePanel,
  SellerPanel,
  stanceOf,
} from "./ViewerPanels";

function useBidding(auction: AuctionDetail, onChanged: () => void) {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const minimum = minimumBid(auction);
  const [amount, setAmount] = useState(String(minimum / 100));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consenting, setConsenting] = useState<number | null>(null);

  const retract = checkRetractEligibility(auction, user?.id);
  const isLeading = auction.viewerBidStatus === "WINNING";

  const request = () => {
    if (!user) return false;
    const parsed = parseLeiInput(amount);
    if (parsed === null) {
      setError("Introdu o sumă validă.");
      return false;
    }
    const takesItOutright =
      auction.buyNowPrice !== undefined && parsed >= auction.buyNowPrice;

    if (!takesItOutright && parsed < minimum) {
      setError(`Minim ${formatMoney(minimum)}.`);
      return false;
    }

    setError(null);
    setConsenting(parsed);
    return true;
  };

  const confirm = async () => {
    if (!user || consenting === null) return false;

    setPending(true);
    try {
      const result = await placeBid(
        {
          auctionId: auction.id,
          amount: consenting,
          acceptedTermsVersion: TERMS.VERSION,
        },
        user.id,
      );
      if (result.boughtNow) {
        toast.success(
          "Oferta ta a fost acceptată",
          "Plătește din conversație pentru a cumpăra produsul.",
        );
      } else {
        toast.success("Oferta a fost transmisă", formatMoney(consenting));
      }
      setConsenting(null);
      onChanged();
      router.push(`/cont/inbox/nou/${auction.id}`);
      return true;
    } catch (caught) {
      toast.error("Oferta nu a fost acceptată", errorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  const undo = async () => {
    if (!user) return;
    setPending(true);
    try {
      await retractBid(auction.id, user.id);
      toast.info("Oferta a fost retrasă");
      onChanged();
    } catch (caught) {
      toast.error("Nu am putut retrage oferta", errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return {
    user,
    minimum,
    amount,
    setAmount,
    pending,
    error,
    retract,
    isLeading,
    consenting,
    request,
    confirm,
    cancelConsent: () => setConsenting(null),
    undo,
  };
}

function AmountForm({
  bidding,
  auction,
  onDone,
}: {
  bidding: ReturnType<typeof useBidding>;
  auction: AuctionDetail;
  onDone?: () => void;
}) {
  const { amount, setAmount, minimum, error, request } = bidding;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (request()) onDone?.();
      }}
      className="flex flex-col gap-3"
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 rounded-2xl bg-ink-100 px-4 transition",
          "focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500",
          error && "bg-danger-50 ring-2 ring-danger-500",
        )}
      >
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Oferta ta în lei"
          autoComplete="off"
          className="numeric min-w-0 flex-1 bg-transparent font-display text-2xl font-extrabold text-ink-900 focus:outline-none"
        />
        <span className="font-display text-lg font-bold text-ink-400">lei</span>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        {[0, 1, 3].map((extra) => {
          const quick = minimum + auction.bidIncrement * extra;
          return (
            <button
              key={extra}
              type="button"
              onClick={() => setAmount(String(quick / 100))}
              className="flex-1 rounded-xl bg-ink-100 py-2 text-sm font-bold text-ink-700 transition hover:bg-ink-200"
            >
              {formatMoney(quick, { compact: true, omitCurrency: true })}
            </button>
          );
        })}
      </div>
      <Button type="submit" size="lg" fullWidth>
        {bidding.isLeading || auction.viewerBidStatus === "OUTBID"
          ? "Mărește oferta"
          : auction.status === "RESERVED"
            ? "Trimite oferta de rezervă"
            : "Licitează"}
      </Button>

      {auction.buyNowPrice ? (
        <button
          type="button"
          onClick={() => setAmount(String(auction.buyNowPrice! / 100))}
          className="rounded-xl border-2 border-dashed border-primary-300 py-2.5 text-sm font-bold text-primary-700 transition hover:border-primary-500 hover:bg-primary-50"
        >
          Cumpără acum la {formatMoney(auction.buyNowPrice)}
        </button>
      ) : null}
    </form>
  );
}

function RuleSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
        {icon}
      </span>
      <div className="min-w-0 leading-relaxed text-ink-600">
        <p className="font-display font-extrabold text-ink-900">{title}</p>
        <div className="mt-1 text-[15px]">{children}</div>
      </div>
    </div>
  );
}

function OfferConsent({
  auction,
  amount,
  busy,
  onClose,
  onAccept,
}: {
  auction: AuctionDetail;
  amount: number | null;
  busy: boolean;
  onClose: () => void;
  onAccept: () => Promise<boolean>;
}) {
  const [accepted, setAccepted] = useState(false);

  const pending = amount ?? 0;
  const takesItOutright =
    auction.buyNowPrice !== undefined && pending >= auction.buyNowPrice;
  const price = takesItOutright ? auction.buyNowPrice! : pending;
  const breakdown = computeFees({
    finalPrice: price as Bani,
    donationPercent: auction.donationPercent,
  });

  return (
    <Modal
      open={amount !== null}
      onClose={onClose}
      title={takesItOutright ? "Confirmă cumpărarea" : "Confirmă oferta"}
      description={
        takesItOutright
          ? "Prețul este cel publicat de vânzător, iar oferta ta este acceptată imediat."
          : "Verifică ce se întâmplă dacă vânzătorul acceptă această ofertă."
      }
    >
      <div className="flex flex-col gap-5 pb-1">
        <FeeBreakdown
          breakdown={breakdown}
          perspective="BUYER"
          causeName={auction.cause.name}
          showExplainer={false}
          className="p-4"
        />

        <RuleSection
          icon={<Icons.auction aria-hidden="true" className="h-5 w-5" />}
          title="Oferta te obligă"
        >
          <p>
            {takesItOutright ? (
              <>
                La acest preț oferta ta este acceptată imediat, fără să mai fie
                nevoie de acordul vânzătorului.
              </>
            ) : (
              <>
                Dacă vânzătorul o acceptă, ai obligația de a finaliza cumpărarea
                la{" "}
                <strong className="numeric font-bold text-ink-900">
                  {formatMoney(price)}
                </strong>
                , plus taxa platformei și livrarea.
              </>
            )}
          </p>
          <p className="mt-2.5">
            Ai{" "}
            <strong className="font-bold text-ink-900">
              {ORDER.CONFIRMATION_HOURS} de ore
            </strong>{" "}
            pentru a alege livrarea și a face plata. După acest termen comanda
            se anulează.
          </p>
        </RuleSection>

        <RuleSection
          icon={<Icons.close aria-hidden="true" className="h-5 w-5" />}
          title="Până la acceptare o poți retrage"
        >
          <p>
            Cât timp oferta nu a fost acceptată, o poți retrage oricând. Odată
            acceptată nu mai poate fi retrasă.
          </p>
        </RuleSection>

        <RuleSection
          icon={<Icons.escrow aria-hidden="true" className="h-5 w-5" />}
          title="Plata se face după acceptare"
        >
          <p>
            Nu plătești nimic acum. Dacă oferta este acceptată, alegi livrarea
            și plătești din conversația cu vânzătorul. Suma este păstrată de
            bid4 până la finalizarea comenzii, iar{" "}
            <strong className="numeric font-bold text-ink-900">
              {formatMoney(breakdown.donationAmount)}
            </strong>{" "}
            ajung la {auction.cause.name}.
          </p>
        </RuleSection>

        <div className="border-t border-line pt-4">
          <Checkbox
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            label={
              <>
                Am citit cele de mai sus și accept{" "}
                <Legal href="/termeni">Termenii și Condițiile</Legal>.
              </>
            }
          />
        </div>

        <Button
          size="lg"
          fullWidth
          disabled={!accepted}
          loading={busy}
          onClick={async () => {
            const ok = await onAccept();
            if (ok) setAccepted(false);
          }}
        >
          {takesItOutright
            ? `Cumpără la ${formatMoney(price)}`
            : `Trimite oferta de ${formatMoney(price)}`}
        </Button>
      </div>
    </Modal>
  );
}

export function BidBox({
  auction,
  onChanged,
  acceptedCount = 0,
}: {
  auction: AuctionDetail;
  onChanged: () => void;
  acceptedCount?: number;
}) {
  const bidding = useBidding(auction, onChanged);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const offerable = isOfferable(auction.status);
  const reserved = auction.status === "RESERVED";

  const {
    user,
    minimum,
    retract,
    isLeading,
    pending,
    undo,
  } = bidding;

  const stance = stanceOf(auction, user?.id);

  const blocker = !user ? (
    <ButtonLink href="/autentificare" size="lg" fullWidth>
      {reserved ? "Trimite o ofertă de rezervă" : "Licitează acum"}
    </ButtonLink>
  ) : null;

  const priceBlock = (
    <div>
      <p className="text-sm text-ink-500">
        {reserved
          ? "Cea mai mare ofertă"
          : auction.bidCount > 0
            ? "Oferta curentă"
            : "Preț de pornire"}
      </p>
      <p className="numeric font-display text-3xl leading-none font-extrabold text-accent-700">
        {formatMoney(auction.currentPrice, { compact: true })}
      </p>
    </div>
  );

  const notice = reserved ? (
    <Notice tone="sky" className="mt-4">
      Vânzătorul a acceptat o ofertă. Produsul este încă disponibil.
    </Notice>
  ) : null;

  const outbid = stance === "outbid";
  const hasOwnOffer = isLeading || outbid;

  const standing = reserved ? null : outbid ? (
    <p className="flex items-center gap-2 font-bold text-sun-800">
      <Icons.warning aria-hidden="true" className="h-4 w-4 shrink-0" />
      Oferta ta a fost depășită
    </p>
  ) : (
    <p className="flex items-center gap-2 font-bold text-primary-800">
      <Icons.success aria-hidden="true" className="h-4 w-4 shrink-0" />
      Ești cel mai bun ofertant
    </p>
  );

  const offerButtons = (
    <div className="flex gap-2">
      <Button
        size="lg"
        className="min-w-0 flex-1 px-4 sm:px-4"
        onClick={() => setSheetOpen(true)}
      >
        Mărește oferta
      </Button>
      {retract.canRetract ? (
        <Button
          variant="danger"
          size="lg"
          className="shrink-0 px-4 sm:px-4"
          onClick={undo}
          loading={pending}
        >
          Retrage
        </Button>
      ) : null}
    </div>
  );

  const leadingPanel = hasOwnOffer ? (
    <div className="mt-4 flex flex-col gap-3">
      {standing}
      {offerButtons}

      {!retract.canRetract && retract.reason ? (
        <p className="text-sm text-ink-500">{retract.reason}</p>
      ) : null}
      <ConversationButton
        auction={auction}
        label="Deschide conversația"
        variant="secondary"
        withIcon
      />
    </div>
  ) : null;

  if (stance === "seller") {
    return <SellerPanel auction={auction} acceptedCount={acceptedCount} />;
  }
  if (stance === "accepted" && offerable) {
    return <AcceptedPanel auction={auction} />;
  }
  if (stance === "buyer" && isCommitted(auction.status)) {
    return <BuyerPanel auction={auction} />;
  }
  if (!offerable) return <OutcomePanel auction={auction} stance={stance} />;

  return (
    <>

      <div className="px-5 py-5">
        {priceBlock}
        {notice}

        {hasOwnOffer ? (
          <div className="hidden lg:block">{leadingPanel}</div>
        ) : (
          <div className="mt-4 hidden lg:block">
            {blocker ?? <AmountForm bidding={bidding} auction={auction} />}
          </div>
        )}

        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 transition hover:text-ink-900"
        >
          <Icons.help aria-hidden="true" className="h-4 w-4 shrink-0" />
          Cum funcționează licitarea
        </button>
      </div>

      {offerable ? (
        <div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
        >
          <div className="mx-auto max-w-7xl">
            {hasOwnOffer ? (
              <>
                {standing ? <div className="mb-2 text-sm">{standing}</div> : null}
                {offerButtons}
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink-500">Oferta minimă</p>
                  <p className="numeric font-display text-2xl leading-none font-extrabold text-ink-900">
                    {formatMoney(minimum, { compact: true })}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="ml-auto flex-1"
                  onClick={() => {
                    if (!user) {
                      router.push("/autentificare");
                      return;
                    }
                    setSheetOpen(true);
                  }}
                >
                  {reserved ? "Ofertă de rezervă" : "Licitează acum"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <OfferConsent
        auction={auction}
        amount={bidding.consenting}
        busy={pending}
        onClose={bidding.cancelConsent}
        onAccept={bidding.confirm}
      />

      <Modal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Cum funcționează licitarea"
        description="Regulile care se aplică oricărei oferte făcute pe bid4."
      >
        <div className="flex flex-col gap-5 pb-1">
          <RuleSection
            icon={<Icons.auction aria-hidden="true" className="h-5 w-5" />}
            title="Oferta"
          >
            <p>
              Oferta minimă este prețul curent plus pasul de licitare, care
              pentru acest anunț este de{" "}
              <strong className="numeric font-bold text-ink-900">
                {formatMoney(auction.bidIncrement)}
              </strong>
              . Pasul se stabilește automat, în funcție de prețul de pornire,
              și nu poate fi modificat de vânzător.
            </p>
            <p className="mt-2.5">
              Poți avea o singură ofertă activă pe un anunț. Dacă oferăi din
              nou, oferta anterioară este înlocuită.
            </p>
          </RuleSection>

          <RuleSection
            icon={<Icons.help aria-hidden="true" className="h-5 w-5" />}
            title="Selecția vânzătorului"
          >
            <p>
              Anunțul nu are termen limită și rămâne deschis până la
              finalizarea unei vânzări, astfel încât poți face o ofertă în
              orice moment.
            </p>
            <p className="mt-2.5">
              Vânzătorul poate accepta mai multe oferte.{" "}
              <strong className="font-bold text-ink-900">
                Produsul este vândut primului cumpărător care plătește
              </strong>
              , iar celelalte comenzi se anulează.
            </p>
          </RuleSection>

          <RuleSection
            icon={<Icons.payment aria-hidden="true" className="h-5 w-5" />}
            title="Plata"
          >
            <p>
              Nu plătești nimic în momentul în care faci o ofertă. Toată
              discuția cu vânzătorul are loc în conversația anunțului, unde îți
              poți modifica sau retrage oferta.
            </p>
            <p className="mt-2.5">
              Dacă oferta ta este acceptată, ai{" "}
              <strong className="font-bold text-ink-900">
                {ORDER.CONFIRMATION_HOURS} de ore pentru a alege livrarea și a
                plăti
              </strong>
              , direct din conversație.
            </p>
          </RuleSection>

          <RuleSection
            icon={<Icons.escrow aria-hidden="true" className="h-5 w-5" />}
            title="Livrarea și eliberarea fondurilor"
          >
            <p>
              După confirmarea plății, vânzătorul are{" "}
              <strong className="font-bold text-ink-900">
                {AUCTION.DISPATCH_DAYS} zile pentru a expedia coletul
              </strong>
              .
            </p>
            <p className="mt-2.5">
              Banii sunt păstrați de bid4 pe toată durata livrării și sunt
              eliberați către vânzător și către cauză după finalizarea
              comenzii.
            </p>
          </RuleSection>
        </div>
      </Modal>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={
          bidding.isLeading || auction.viewerBidStatus === "OUTBID"
            ? "Mărește oferta"
            : "Oferta ta"
        }
      >
        <div className="pb-2">
          {blocker ?? (
            <AmountForm
              bidding={bidding}
              auction={auction}
              onDone={() => setSheetOpen(false)}
            />
          )}
          {hasOwnOffer ? null : (
            <>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setRulesOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 transition hover:text-ink-900"
              >
                <Icons.help aria-hidden="true" className="h-4 w-4 shrink-0" />
                Cum funcționează licitarea
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
                <Icons.escrow
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                Nu plătești nimic acum. Plata se face din conversație, doar
                dacă vânzătorul acceptă oferta.
              </p>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
