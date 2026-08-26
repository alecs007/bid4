"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Button,
  ButtonLink,
  Confetti,
  CountdownBar,
  CountdownBoard,
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
import { ORDER } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatMoney, parseLeiInput } from "@/lib/money";
import { formatDateTimeRo } from "@/lib/utils/date";
import type { AuctionDetail } from "@/lib/types";
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

  const eligibility = checkBidEligibility(user);
  const retract = checkRetractEligibility(auction, user?.id);
  const isSeller = user?.id === auction.sellerId;
  const isLeading = auction.viewerBidStatus === "WINNING";

  const submit = async () => {
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
    setPending(true);
    try {
      const result = await placeBid(
        { auctionId: auction.id, amount: parsed },
        user.id,
      );
      setCelebrate((value) => value + 1);
      if (result.boughtNow) {
        toast.success(
          "Ai cumpărat acum",
          `Licitația s-a încheiat la ${formatMoney(result.auction.currentPrice)}.`,
        );
      } else if (result.extendedBySeconds) {
        toast.toast({
          title: "Ofertă plasată, timp prelungit",
          description: `Licitația s-a prelungit cu ${result.extendedBySeconds} de secunde.`,
          tone: "primary",
        });
      } else {
        toast.success("Ești pe primul loc", formatMoney(parsed));
      }
      onChanged();
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
    celebrate,
    eligibility,
    retract,
    isSeller,
    isLeading,
    submit,
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
  const { amount, setAmount, minimum, error, pending, submit } = bidding;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await submit();
        if (ok) onDone?.();
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
      <Button type="submit" size="lg" fullWidth loading={pending}>
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

function Result({
  auction,
  viewerId,
  winnerName,
}: {
  auction: AuctionDetail;
  viewerId?: string;
  winnerName?: string;
}) {
  const sold = auction.status === "SOLD";
  const viewerWon = sold && auction.winnerId === viewerId;
  const donation = Math.round(
    (auction.currentPrice * auction.donationPercent) / 100,
  );

  if (!sold) {
    return (
      <div className="p-4">
        <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink-900">
          <Icons.clock aria-hidden="true" className="h-5 w-5 text-ink-400" />
          Licitația s-a încheiat
        </p>
        <p className="mt-1.5 text-ink-600">
          {auction.bidCount === 0
            ? "Licitația s-a încheiat fără nicio ofertă."
            : "Prețul minim al licitației nu a fost atins."}
        </p>
        <ButtonLink href="/licitatii" variant="secondary" className="mt-4">
          Vezi alte licitații
        </ButtonLink>
      </div>
    );
  }

  return (
    <div
      className={cn("p-4", viewerWon && "bg-primary-50")}
    >
      <p className="flex items-center gap-2 text-sm font-bold text-success-700">
        <Icons.success aria-hidden="true" className="h-4 w-4" />
        {viewerWon ? "Ai câștigat!" : "Vândut"}
      </p>
      <p className="mt-2 text-sm text-ink-500">Preț final</p>
      <p className="numeric font-display text-3xl leading-none font-extrabold text-ink-900">
        {formatMoney(auction.currentPrice)}
      </p>
      <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Câștigător</dt>
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

      {viewerWon ? (
        <ButtonLink href="/cont/comenzi" size="lg" fullWidth className="mt-4">
          Vezi comanda
        </ButtonLink>
      ) : (
        <ButtonLink
          href="/licitatii"
          variant="secondary"
          fullWidth
          className="mt-4"
        >
          Vezi alte licitații
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
  const live = auction.status === "LIVE";

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

  const blocker = !live ? (
    <p className="text-ink-600">
      {auction.status === "SCHEDULED"
        ? "Licitația nu a început încă."
        : "Licitația s-a încheiat."}
    </p>
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
      <p className="numeric font-display text-3xl leading-none font-extrabold text-ink-900">
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
            leftIcon={<Icons.close aria-hidden="true" className="h-4 w-4" />}
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

  if (!live && auction.status !== "SCHEDULED") {
    return (
      <Result auction={auction} viewerId={user?.id} winnerName={winnerName} />
    );
  }

  return (
    <>
      {celebrate > 0 ? <Confetti trigger={celebrate} count={30} /> : null}

      <div className="border-b border-line px-5 pt-4 pb-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Icons.calendar aria-hidden="true" className="h-3.5 w-3.5" />
          Publicată {formatDateTimeRo(auction.startTime)}
        </p>
      </div>

      {live ? (
        <div className="hidden border-b border-line px-5 py-4 lg:block">
          <CountdownBoard
            endTime={auction.endTime}
            startTime={auction.startTime}
            extensionCount={auction.extensionCount}
          />
        </div>
      ) : null}

      <div className="px-5 py-5">
        {priceBlock}

        {isLeading ? (
          <div className="hidden lg:block">{leadingPanel}</div>
        ) : (
          <div className="mt-4 hidden lg:block">
            {blocker ?? <AmountForm bidding={bidding} auction={auction} />}
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ink-600 transition hover:text-ink-900"
            >
              <Icons.help aria-hidden="true" className="h-4 w-4" />
              Cum funcționează licitarea
            </button>
          </div>
        )}
      </div>

      {live && !isSeller ? (
        <div
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden"
        >
          <div className="mx-auto max-w-7xl">
            <CountdownBar
              endTime={auction.endTime}
              startTime={auction.startTime}
              className="mb-2.5"
            />

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

      <Modal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Cum funcționează licitarea"
      >
        <ul className="flex flex-col gap-3.5 text-[15px] text-ink-700">
          <li className="flex gap-3">
            <Icons.auction
              aria-hidden="true"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-400"
            />
            <span>
              Oferta minimă este prețul curent plus pasul de licitare, acum{" "}
              <strong className="numeric text-ink-900">
                {formatMoney(auction.bidIncrement, { compact: true })}
              </strong>
              . Poți oferi și mai mult dacă vrei să descurajezi alți ofertanți.
            </span>
          </li>
          <li className="flex gap-3">
            <Icons.payment
              aria-hidden="true"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-400"
            />
            <span>
              Cardul nu este debitat când licitezi. Plata se face o singură
              dată, după ce câștigi.
            </span>
          </li>
          <li className="flex gap-3">
            <Icons.clock
              aria-hidden="true"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-400"
            />
            <span>
              O ofertă plasată în ultimele{" "}
              <strong className="text-ink-900">
                {Math.round(auction.antiSnipeSeconds / 60)} minute
              </strong>{" "}
              prelungește licitația cu același interval, ca nimeni să nu câștige
              pe ultima secundă.
            </span>
          </li>
          <li className="flex gap-3">
            <Icons.refresh
              aria-hidden="true"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-400"
            />
            <span>
              Poți avea o singură ofertă activă pe un anunț. Dacă licitezi din
              nou, oferta veche este înlocuită.
            </span>
          </li>
          <li className="flex gap-3">
            <Icons.escrow
              aria-hidden="true"
              className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink-400"
            />
            <span>
              Dacă alți ofertanți te depășesc, nu plătești nimic. Dacă câștigi,
              ai {ORDER.CONFIRMATION_HOURS} de ore să confirmi comanda, iar banii
              stau la bid4 până confirmi că ai primit coletul.
            </span>
          </li>
        </ul>
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
            <Icons.help aria-hidden="true" className="h-4 w-4" />
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
