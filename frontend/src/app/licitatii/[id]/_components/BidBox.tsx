"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Button,
  ButtonLink,
  Checkbox,
  Confetti,
  FeeBreakdown,
  Legal,
  Modal,
  Sheet,
  useToast,
} from "@/components/ui";
import {
  checkBidEligibility,
  checkRetractEligibility,
  minimumBid,
  placeBid,
  retractBid,
} from "@/lib/api/bids";
import { AUCTION, ORDER, TERMS, type Bani } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";
import { computeFees, formatMoney, parseLeiInput } from "@/lib/money";
import type { AuctionDetail } from "@/lib/types";
import { isOfferable } from "@/lib/types";
import { errorMessage } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils/cn";

function useBidding(auction: AuctionDetail, onChanged: () => void) {
  const { user } = useAuth();
  const toast = useToast();

  const minimum = minimumBid(auction);
  const [amount, setAmount] = useState(String(minimum / 100));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  // The amount waiting on consent. Null means nothing is waiting, which is also
  // what closes the modal — one piece of state rather than an amount and a flag
  // that can disagree about whether there is an offer pending.
  const [consenting, setConsenting] = useState<number | null>(null);

  const eligibility = checkBidEligibility(user);
  const retract = checkRetractEligibility(auction, user?.id);
  const isSeller = user?.id === auction.sellerId;
  const isLeading = auction.viewerBidStatus === "WINNING";

  /**
   * Checks the amount and hands it to the consent modal. Nothing is sent from here.
   *
   * <p>Every way of making an offer arrives at this one function — the panel on a desktop, the
   * sheet on a phone, and the button that fills in the final price — so the consent cannot be
   * reached around by using a different entrance.
   */
  const request = () => {
    if (!user) return false;
    const parsed = parseLeiInput(amount);
    if (parsed === null) {
      setError("Introdu o sumă validă.");
      return false;
    }
    // The final price is checked first, exactly as the server does: with a large
    // increment it can sit below the next valid raise, and refusing it here
    // would put the "cumpără acum" button out of reach of its own price.
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

  /** The offer itself, once the terms on screen have been accepted. */
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
      setCelebrate((value) => value + 1);
      if (result.boughtNow) {
        // Reserved, not sold: the price is settled, but the money has not moved.
        toast.success(
          "Anunțul este al tău",
          `Reținut la ${formatMoney(result.auction.currentPrice)}. Urmează plata.`,
        );
      } else {
        toast.success("Ești pe primul loc", formatMoney(consenting));
      }
      setConsenting(null);
      onChanged();
      return true;
    } catch (caught) {
      // The modal stays open on a refusal. Closing it would throw away an
      // acceptance the reader has already given, and make them give it again
      // for a failure that was not theirs.
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
    celebrate,
    eligibility,
    retract,
    isSeller,
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
        // The sheet closes as the consent opens rather than stacking under it:
        // two overlays deep on a phone leaves nothing of the page to orient by.
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
        {bidding.isLeading ? "Mărește oferta" : "Licitează"}
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

/**
 * One rule, laid out like the buyer-protection points on the page around it — an icon, a heading
 * and prose — so the two modals read as the same document rather than two different voices.
 */
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

/**
 * What the bidder is agreeing to, before the offer goes anywhere.
 *
 * <p>An offer is a commitment to pay, so it is not sent by a button press alone. Everything the
 * commitment carries is on one screen: what it costs, where the donation goes, how long they have
 * if it is taken, and what may still be undone. The version ticked here is sent with the offer and
 * stored beside it, and the server refuses an offer that does not name the version it is currently
 * publishing.
 *
 * <p>It opens from the one place every entrance leads to, so there is no route to an offer that
 * skips it.
 */
function OfferConsent({
  auction,
  amount,
  busy,
  onClose,
  onAccept,
}: {
  auction: AuctionDetail;
  /** The offer awaiting consent, or null when nothing is. */
  amount: number | null;
  busy: boolean;
  onClose: () => void;
  onAccept: () => Promise<boolean>;
}) {
  const [accepted, setAccepted] = useState(false);

  const pending = amount ?? 0;
  const takesItOutright =
    auction.buyNowPrice !== undefined && pending >= auction.buyNowPrice;
  // Settled at the advertised price when the offer reaches it, which is what
  // the server will charge — so it is the number this screen has to show.
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
          ? "Prețul este cel publicat de vânzător, iar anunțul îți este reținut imediat."
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
                La acest preț anunțul îți este reținut pe loc, fără să mai fie
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
          title="Banii sunt păstrați de bid4"
        >
          <p>
            Cardul nu este debitat acum. Suma este administrată de bid4 pe toată
            durata livrării, iar{" "}
            <strong className="numeric font-bold text-ink-900">
              {formatMoney(breakdown.donationAmount)}
            </strong>{" "}
            ajung la {auction.cause.name} abia după ce confirmi că ai primit
            coletul.
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

function Result({
  auction,
  viewerId,
  winnerName,
}: {
  auction: AuctionDetail;
  viewerId?: string;
  winnerName?: string;
}) {
  const committed = auction.status === "RESERVED" || auction.status === "SOLD";
  const reserved = auction.status === "RESERVED";
  const viewerWon = committed && auction.winnerId === viewerId;
  // The agreed price, which is not the highest offer if bidding carried on
  // past the acceptance before the buyer paid.
  const settledPrice = auction.acceptedAmount ?? auction.currentPrice;
  const donation = Math.round((settledPrice * auction.donationPercent) / 100);

  // Withdrawn. Nothing "ended" — the seller took it down, and saying so is
  // both truer and less deflating than announcing a failed auction.
  if (!committed) {
    return (
      <div className="p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink-900">
          <Icons.close aria-hidden="true" className="h-5 w-5 text-ink-400" />
          Anunțul a fost retras
        </p>
        <p className="mt-1.5 text-ink-600">
          Vânzătorul l-a scos de pe platformă. Ofertele făcute nu mai sunt
          valabile.
        </p>
        <ButtonLink href="/licitatii" variant="secondary" className="mt-4">
          Vezi alte anunțuri
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={cn("p-4", viewerWon && "bg-primary-50")}>
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-bold",
          reserved ? "text-sky-700" : "text-success-700",
        )}
      >
        <Icons.success aria-hidden="true" className="h-4 w-4 shrink-0" />
        {viewerWon
          ? reserved
            ? "Oferta ta a fost acceptată"
            : "Ai câștigat!"
          : reserved
            ? "Ofertă acceptată"
            : "Vândut"}
      </p>
      <p className="mt-2 text-sm text-ink-500">Preț final</p>
      <p className="numeric font-display text-3xl leading-none font-extrabold text-accent-700">
        {formatMoney(settledPrice)}
      </p>
      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Cumpărător</dt>
          <dd className="font-bold text-ink-900">
            {viewerWon ? "Tu" : (winnerName ?? "Un ofertant")}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Donație către cauză</dt>
          <dd className="numeric font-bold text-primary-700">
            {formatMoney(donation)}
          </dd>
        </div>
      </dl>

      {reserved ? (
        <p className="mt-3 text-sm text-ink-500">
          {viewerWon
            ? "Finalizează plata ca vânzătorul să poată trimite coletul."
            : "Cumpărătorul are de făcut plata."}
        </p>
      ) : null}

      {viewerWon ? (
        <ButtonLink href="/cont/comenzi" size="lg" fullWidth className="mt-4">
          {reserved ? "Finalizează comanda" : "Vezi comanda"}
        </ButtonLink>
      ) : (
        <ButtonLink
          href="/licitatii"
          variant="secondary"
          fullWidth
          className="mt-4"
        >
          Vezi alte anunțuri
        </ButtonLink>
      )}
    </div>
  );
}

export function BidBox({
  auction,
  onChanged,
  winnerName,
}: {
  auction: AuctionDetail;
  onChanged: () => void;
  winnerName?: string;
}) {
  const bidding = useBidding(auction, onChanged);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // Reserved counts as open. The seller can still release the offer they took,
  // so the room goes on bidding — and a page that hid the form would be the
  // reason a better offer never arrived.
  const offerable = isOfferable(auction.status);

  const {
    user,
    minimum,
    celebrate,
    eligibility,
    retract,
    isSeller,
    isLeading,
    pending,
    undo,
  } = bidding;

  const blocker = !offerable ? (
    <p className="text-ink-600">Anunțul nu mai acceptă oferte.</p>
  ) : isSeller ? (
    <p className="text-ink-600">Acesta este anunțul tău.</p>
  ) : !user ? (
    <ButtonLink href="/autentificare" size="lg" fullWidth>
      Licitează acum
    </ButtonLink>
  ) : !eligibility.canBid ? (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-600">{eligibility.reason}</p>
      <ButtonLink href="/cont/setari" size="lg" fullWidth>
        {!eligibility.hasCard ? "Adaugă un card" : "Alege livrarea"}
      </ButtonLink>
    </div>
  ) : null;

  const priceBlock = (
    <div>
      <p className="text-sm text-ink-500">
        {auction.bidCount > 0 ? "Oferta curentă" : "Preț de pornire"}
      </p>
      <p className="numeric font-display text-3xl leading-none font-extrabold text-accent-700">
        {formatMoney(auction.currentPrice, { compact: true })}
      </p>
    </div>
  );

  const leadingPanel = isLeading ? (
    <div className="mt-4 flex flex-col gap-3">
      <p className="flex items-center gap-2 font-bold text-primary-800">
        <Icons.success aria-hidden="true" className="h-4 w-4 shrink-0" />
        Ești cel mai bun ofertant
      </p>
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={() => setSheetOpen(true)}>
          Mărește oferta
        </Button>
        {retract.canRetract ? (
          <Button
            variant="danger"
            size="lg"
            onClick={undo}
            loading={pending}
            leftIcon={<Icons.close aria-hidden="true" className="h-4 w-4 shrink-0" />}
          >
            Retrage
          </Button>
        ) : null}
      </div>

      {!retract.canRetract && retract.reason ? (
        <p className="text-sm text-ink-500">{retract.reason}</p>
      ) : null}
    </div>
  ) : null;

  // Only a settled listing gets the terminal panel. A reserved one is still a
  // listing you can act on, so it keeps the form and explains itself above it.
  if (!offerable) {
    return (
      <Result auction={auction} viewerId={user?.id} winnerName={winnerName} />
    );
  }

  // A reserved listing is deliberately indistinguishable from an open one here.
  // Whose offer was taken, and for how much, is between the seller and that
  // buyer — both of them see it on their own pages. Publishing it on the listing
  // would price every later offer against a number that is nobody else's
  // business, and the acceptance can still be undone anyway.

  return (
    <>
      {celebrate > 0 ? <Confetti trigger={celebrate} count={30} /> : null}

      {/* A countdown used to open this box. Nothing replaced it: the box starts
          on the price, and how the sale works is one click away rather than a
          paragraph everyone has to read past to reach the number. */}
      <div className="px-5 py-5">
        {priceBlock}

        {isLeading ? (
          <div className="hidden lg:block">{leadingPanel}</div>
        ) : (
          <div className="mt-4 hidden lg:block">
            {blocker ?? <AmountForm bidding={bidding} auction={auction} />}
          </div>
        )}

        {/* Always in the flow, at both widths. On a phone the form lives in the
            bottom bar and its sheet, so a trigger tucked in there is one a
            signed-out reader never reaches — and they are exactly who the rules
            are written for. */}
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 transition hover:text-ink-900"
        >
          <Icons.help aria-hidden="true" className="h-4 w-4 shrink-0" />
          Cum funcționează licitarea
        </button>
      </div>

      {offerable && !isSeller ? (
        <div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
        >
          <div className="mx-auto max-w-7xl">
            {isLeading ? (
              <>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary-800">
                  <Icons.success
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                  />
                  Ești cel mai bun ofertant
                </p>
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => setSheetOpen(true)}
                  >
                    Mărește oferta
                  </Button>
                  {retract.canRetract ? (
                    <Button
                      variant="danger"
                      size="lg"
                      onClick={undo}
                      loading={pending}
                    >
                      Retrage
                    </Button>
                  ) : null}
                </div>
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
                  Licitează acum
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Rendered once, outside both the desktop panel and the phone sheet, so
          one consent screen serves every way of making an offer. */}
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
              Vânzătorul este cel care alege oferta câștigătoare și{" "}
              <strong className="font-bold text-ink-900">
                poate alege orice ofertă primită, nu doar pe cea mai mare
              </strong>
              . Suma nu este singurul criteriu.
            </p>
          </RuleSection>

          <RuleSection
            icon={<Icons.payment aria-hidden="true" className="h-5 w-5" />}
            title="Plata"
          >
            <p>
              Cardul nu este debitat în momentul în care faci o ofertă. Dacă
              vânzătorul alege altă ofertă, nu plătești nimic.
            </p>
            <p className="mt-2.5">
              Dacă oferta ta este acceptată, ai{" "}
              <strong className="font-bold text-ink-900">
                {ORDER.CONFIRMATION_HOURS} de ore pentru a confirma comanda
              </strong>{" "}
              și pentru a finaliza plata.
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
              eliberați către vânzător și către cauză abia după ce confirmi că
              ai primit produsul.
            </p>
          </RuleSection>
        </div>
      </Modal>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={bidding.isLeading ? "Mărește oferta" : "Oferta ta"}
      >
        <div className="pb-2">
          {blocker ?? (
            <AmountForm
              bidding={bidding}
              auction={auction}
              onDone={() => setSheetOpen(false)}
            />
          )}
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
            Dacă vei câștiga, cardul salvat este debitat automat, iar banii
            rămân la bid4 până confirmi că ai primit coletul.
          </p>
        </div>
      </Sheet>
    </>
  );
}
