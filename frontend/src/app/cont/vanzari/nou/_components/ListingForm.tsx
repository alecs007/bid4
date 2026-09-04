"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Alert,
  Button,
  ButtonLink,
  Checkbox,
  CategoryIcon,
  Confetti,
  Field,
  Illustration,
  Input,
  Mascot,
  Select,
  Slider,
  Textarea,
} from "@/components/ui";
import { createAuction } from "@/lib/api/auctions";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  AUCTION,
  AUCTION_CATEGORIES,
  DONATION,
  type AuctionCategoryId,
} from "@/lib/config";
import { useAction } from "@/lib/hooks/useApi";
import { ITEM_CONDITION } from "@/lib/labels";
import { formatMoney, parseLeiInput } from "@/lib/money";
import type {
  AuctionDetail,
  ItemCondition,
  UploadedFileRef,
} from "@/lib/types";
import { scrollPageTo } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";
import { CausePicker } from "./CausePicker";
import { PhotoPicker } from "./PhotoPicker";

const CONDITIONS = Object.entries(ITEM_CONDITION).map(([value, label]) => ({
  value: value as ItemCondition,
  label,
}));

/** What the form holds while it is being filled in: text, because that is what an input has. */
interface Draft {
  title: string;
  description: string;
  category: AuctionCategoryId | "";
  condition: ItemCondition | "";
  parcel: (typeof AUCTION.PARCEL_TYPES)[number]["id"] | "";
  startingPrice: string;
  buyNowPrice: string;
  donationPercent: number;
  causeId: string;
  termsAccepted: boolean;
  ownershipConfirmed: boolean;
}

const EMPTY: Draft = {
  title: "",
  description: "",
  category: "",
  condition: "",
  parcel: "",
  startingPrice: "",
  buyNowPrice: "",
  donationPercent: DONATION.DEFAULT_PERCENT,
  causeId: "",
  termsAccepted: false,
  ownershipConfirmed: false,
};

type Errors = Partial<Record<keyof Draft | "images", string>>;

/** Room above the field the page lands on, so it sits under the header rather than beneath it. */
const FIRST_ERROR_MARGIN_PX = 96;

/**
 * "8 caractere", but "20 de caractere".
 *
 * <p>Romanian puts `de` between a number and its noun from twenty up. Every bound this form
 * quotes is either below twenty or a round number above it, which is exactly where the simple
 * form of the rule holds.
 */
function plural(count: number): string {
  return count < 20 ? `${count} caractere` : `${count} de caractere`;
}

/**
 * The photographs, then the object, then the price. One column, no furniture.
 *
 * <p>No steps, no panels, no headings over groups of fields. Each of those was something to read
 * before reaching the thing to fill in, and the fields already say what they are — a heading
 * called "Produsul" above a field called "Titlu" is the same word twice.
 */
export function ListingForm() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [photos, setPhotos] = useState<UploadedFileRef[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [created, setCreated] = useState<AuctionDetail | null>(null);
  /** The range is hidden until asked for: most sellers want one of the presets. */
  const [custom, setCustom] = useState(false);

  const submit = useAction(createAuction);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    // The message goes the moment the field it belongs to changes. Leaving it up
    // while somebody types the fix is the form arguing with them.
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const parcel = AUCTION.PARCEL_TYPES.find(
    (entry) => entry.id === draft.parcel,
  );
  const startingPrice = parseLeiInput(draft.startingPrice);
  const buyNowPrice = draft.buyNowPrice
    ? parseLeiInput(draft.buyNowPrice)
    : null;

  const validate = (): Errors => {
    const found: Errors = {};

    if (photos.length < AUCTION.MIN_IMAGES) {
      found.images = "Adaugă cel puțin o fotografie.";
    }
    if (draft.title.trim().length < AUCTION.MIN_TITLE_LENGTH) {
      found.title = `Titlul trebuie să conțină cel puțin ${plural(AUCTION.MIN_TITLE_LENGTH)}.`;
    }
    if (draft.description.trim().length < AUCTION.MIN_DESCRIPTION_LENGTH) {
      found.description = `Descrierea trebuie să conțină cel puțin ${plural(AUCTION.MIN_DESCRIPTION_LENGTH)}.`;
    }
    if (!draft.category) found.category = "Selectează o categorie.";
    if (!draft.condition) found.condition = "Selectează starea obiectului.";
    if (!parcel) found.parcel = "Selectează mărimea coletului.";

    if (startingPrice === null) {
      found.startingPrice = "Introdu prețul de pornire.";
    } else if (startingPrice < AUCTION.MIN_STARTING_PRICE) {
      found.startingPrice = `Prețul de pornire trebuie să fie de cel puțin ${formatMoney(AUCTION.MIN_STARTING_PRICE)}.`;
    } else if (startingPrice > AUCTION.MAX_STARTING_PRICE) {
      found.startingPrice = `Prețul de pornire nu poate depăși ${formatMoney(AUCTION.MAX_STARTING_PRICE)}.`;
    }

    if (draft.buyNowPrice && buyNowPrice === null) {
      found.buyNowPrice = "Introdu o sumă validă sau lasă câmpul gol.";
    } else if (
      buyNowPrice !== null &&
      startingPrice !== null &&
      buyNowPrice <= startingPrice
    ) {
      found.buyNowPrice =
        "Prețul de vânzare directă trebuie să fie mai mare decât prețul de pornire.";
    }

    if (!draft.causeId) found.causeId = "Selectează cauza susținută.";
    if (!draft.ownershipConfirmed) {
      found.ownershipConfirmed =
        "Confirmă că obiectul îți aparține și poate fi trimis.";
    }
    if (!draft.termsAccepted) {
      found.termsAccepted = "Acceptă termenii pentru vânzători.";
    }

    return found;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Straight to the first thing that needs attention rather than a list at
      // the top: on a phone the list and the field are never on screen together.
      //
      // Through Lenis rather than scrollIntoView, which sets the position
      // directly and leaves Lenis animating towards a target it no longer
      // agrees with — the page then snaps back a frame later.
      const first = document.querySelector<HTMLElement>(
        "[data-invalid='true']",
      );
      if (first) {
        scrollPageTo(first, { offset: -FIRST_ERROR_MARGIN_PX });
        first.focus?.({ preventScroll: true });
      }
      return;
    }

    const auction = await submit.run(
      {
        title: draft.title.trim(),
        description: draft.description.trim(),
        // TODO(backend): there is no POST /uploads yet, so what travels is the
        // object URL the browser made. It renders for the session that created
        // it and nowhere else — the picker is real, the storage is not.
        images: photos.map((photo) => photo.previewUrl ?? photo.fileRef),
        category: draft.category as AuctionCategoryId,
        condition: draft.condition as ItemCondition,
        weightGrams: parcel!.weightGrams,
        causeId: draft.causeId,
        donationPercent: draft.donationPercent,
        startingPrice: startingPrice!,
        ...(buyNowPrice !== null ? { buyNowPrice } : {}),
      },
      user.id,
    );

    if (auction) setCreated(auction);
  };

  if (created) return <SubmittedScreen auction={created} />;

  const donated =
    startingPrice !== null && startingPrice > 0
      ? Math.round((startingPrice * draft.donationPercent) / 100)
      : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-extrabold text-ink-900">
        Licitație nouă
      </h1>

      <Panel>
        <Field label="Fotografii" error={errors.images} required>
          <div data-invalid={errors.images ? "true" : undefined}>
            <PhotoPicker value={photos} onChange={setPhotos} />
          </div>
        </Field>

        <Field label="Titlu" error={errors.title} required>
          <Input
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            maxLength={AUCTION.MAX_TITLE_LENGTH}
            placeholder="Numele obiectului"
            data-invalid={errors.title ? "true" : undefined}
          />
        </Field>

        <Field label="Detalii" error={errors.description} required>
          <Textarea
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={AUCTION.MAX_DESCRIPTION_LENGTH}
            rows={5}
            placeholder="Ce include, cum a fost folosit și orice detaliu util cumpărătorului."
            data-invalid={errors.description ? "true" : undefined}
          />
        </Field>

        <Field label="Categorie" error={errors.category} required>
          <div
            role="radiogroup"
            aria-label="Categorie"
            className="grid grid-cols-3 gap-2 sm:grid-cols-5"
            data-invalid={errors.category ? "true" : undefined}
          >
            {AUCTION_CATEGORIES.map((entry) => {
              const chosen = draft.category === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => set("category", entry.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition",
                    chosen
                      ? "bg-primary-50 ring-1 ring-primary-500"
                      : "bg-canvas hover:bg-white hover:ring-1 hover:ring-edge",
                  )}
                >
                  <CategoryIcon
                    set="categories"
                    id={entry.id}
                    className="h-7 w-7"
                    sizes="28px"
                  />
                  {/* One line, always. `truncate` rather than a smaller size:
                      the longest label fits at 10px, and if a future one does
                      not it ends in an ellipsis instead of wrapping the tile
                      taller than the eight beside it. */}
                  <span
                    title={entry.label}
                    className={cn(
                      "w-full truncate text-[10px] leading-none font-bold",
                      chosen ? "text-primary-900" : "text-ink-700",
                    )}
                  >
                    {entry.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Mărimea coletului" error={errors.parcel} required>
          <div
            role="radiogroup"
            aria-label="Mărimea coletului"
            className="grid grid-cols-3 gap-2 sm:gap-3"
            data-invalid={errors.parcel ? "true" : undefined}
          >
            {AUCTION.PARCEL_TYPES.map((parcel) => {
              const chosen = draft.parcel === parcel.id;
              return (
                <button
                  key={parcel.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => set("parcel", parcel.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center transition",
                    chosen
                      ? "bg-primary-50 ring-1 ring-primary-500"
                      : "ring-1 ring-edge hover:ring-ink-300",
                  )}
                >
                  {parcel.illustration ? (
                    <Illustration
                      src={parcel.illustration}
                      className="h-10 w-10"
                      sizes="40px"
                    />
                  ) : (
                    <Icons.parcel
                      aria-hidden="true"
                      className="h-8 w-8 text-ink-400"
                    />
                  )}
                  <span className="font-display text-sm font-extrabold text-ink-900">
                    {parcel.label}
                  </span>
                  <span className="text-[11px] leading-tight text-ink-500">
                    {parcel.examples}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Stare"
          error={errors.condition}
          required
          className="sm:max-w-xs"
        >
          <div data-invalid={errors.condition ? "true" : undefined}>
            <Select
              ariaLabel="Starea obiectului"
              value={draft.condition}
              options={CONDITIONS}
              onChange={(value) => set("condition", value)}
              placeholder="Alege starea"
            />
          </div>
        </Field>
      </Panel>

      <Panel>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preț de pornire" error={errors.startingPrice} required>
            <Input
              value={draft.startingPrice}
              onChange={(event) => set("startingPrice", event.target.value)}
              inputMode="decimal"
              placeholder="0"
              trailing={<span className="text-sm text-ink-500">lei</span>}
              data-invalid={errors.startingPrice ? "true" : undefined}
            />
          </Field>

          <Field
            label="Preț de vânzare directă"
            error={errors.buyNowPrice}
            optionalLabel
          >
            <Input
              value={draft.buyNowPrice}
              onChange={(event) => set("buyNowPrice", event.target.value)}
              inputMode="decimal"
              placeholder="—"
              trailing={<span className="text-sm text-ink-500">lei</span>}
              data-invalid={errors.buyNowPrice ? "true" : undefined}
            />
          </Field>
        </div>

        {/* The presets answer it for most sellers; the range is there for
            whoever wants 35, and only then. The percentage is written once —
            in the pressed preset, or in the slider's own header when the range
            is open — because two live copies of one number invite the reader to
            check whether they agree. */}
        <Field label="Procentul donat" required>
          <div className="flex flex-wrap gap-1.5">
            {DONATION.PRESET_PERCENTS.map((percent) => {
              const chosen = !custom && draft.donationPercent === percent;
              return (
                <button
                  key={percent}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => {
                    setCustom(false);
                    set("donationPercent", percent);
                  }}
                  className={cn(
                    "numeric rounded-full px-3.5 py-1.5 text-sm font-bold transition",
                    chosen
                      ? "bg-primary-600 text-white"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200",
                  )}
                >
                  {percent}%
                </button>
              );
            })}

            <button
              type="button"
              aria-pressed={custom}
              onClick={() => setCustom(true)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-bold transition",
                custom
                  ? "bg-primary-600 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200",
              )}
            >
              Altă valoare
            </button>
          </div>

          {/* Always mounted, opened by a grid row going from 0fr to 1fr. A
              height animates both ways this way; a component that unmounts can
              only ever animate in, and vanishes on the way out. */}
          <div
            aria-hidden={!custom}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              custom
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="pt-3">
                <Slider
                  label="Procent donat"
                  value={draft.donationPercent}
                  min={DONATION.MIN_PERCENT}
                  max={DONATION.MAX_PERCENT}
                  step={5}
                  onChange={(value) => set("donationPercent", value)}
                  formatValue={(value) => `${value}%`}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-ink-500">
            Procentul se aplică prețului final al licitației, iar suma ajunge la
            cauză după confirmarea livrării.
            {donated !== null ? (
              <>
                {" "}
                La prețul de pornire, cauza ar primi{" "}
                <strong className="numeric text-primary-800">
                  {formatMoney(donated)}
                </strong>
                .
              </>
            ) : null}
          </p>
        </Field>

        <Field label="Cauza susținută" error={errors.causeId} required>
          <div data-invalid={errors.causeId ? "true" : undefined}>
            <CausePicker
              value={draft.causeId}
              onChange={(causeId) => set("causeId", causeId)}
            />
          </div>
        </Field>

        <div className="flex flex-col gap-3">
          <Checkbox
            checked={draft.ownershipConfirmed}
            onChange={(event) =>
              set("ownershipConfirmed", event.target.checked)
            }
            label="Obiectul îmi aparține și îl pot trimite"
            data-invalid={errors.ownershipConfirmed ? "true" : undefined}
          />
          {errors.ownershipConfirmed ? (
            <p role="alert" className="text-sm font-semibold text-danger-600">
              {errors.ownershipConfirmed}
            </p>
          ) : null}

          <Checkbox
            checked={draft.termsAccepted}
            onChange={(event) => set("termsAccepted", event.target.checked)}
            label="Accept termenii bid4 pentru vânzători"
            data-invalid={errors.termsAccepted ? "true" : undefined}
          />
          {errors.termsAccepted ? (
            <p role="alert" className="text-sm font-semibold text-danger-600">
              {errors.termsAccepted}
            </p>
          ) : null}
        </div>
      </Panel>

      {submit.error ? <Alert tone="danger">{submit.error}</Alert> : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={submit.pending}
        className="sm:w-auto sm:self-start"
      >
        Finalizează licitația
      </Button>
    </form>
  );
}

/**
 * One half of the form, on its own surface.
 *
 * <p>Two panels rather than one long column on the page's grey: the object and the money are
 * separate decisions, and the break between them is the only thing that has to be said — so it is
 * said with a gap and an edge rather than with a heading nobody needed to read.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-white p-4 ring-1 ring-edge sm:p-6">
      {children}
    </div>
  );
}

/**
 * What happens after the send, which is not "it is live".
 *
 * <p>The listing is in review, and the one thing a seller wants to know is when it stops being in
 * review and where to look. Both are here, and the link goes to the page that will show it.
 */
function SubmittedScreen({ auction }: { auction: AuctionDetail }) {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-5 py-8 text-center">
      <Confetti />
      <Mascot mood="cheer" size={104} floating />

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Licitația a plecat spre verificare
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-600">
          <strong className="text-ink-900">{auction.title}</strong> este acum în
          verificare. Ne uităm peste el în scurt timp și îți scriem imediat ce
          devine public. Îl poți urmări și retrage oricând din Vânzările mele.
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:justify-center">
        <ButtonLink href="/cont/vanzari" size="lg">
          Vezi vânzările mele
        </ButtonLink>
        <ButtonLink href="/cont/vanzari/nou" variant="secondary" size="lg">
          Adaugă altă licitație
        </ButtonLink>
      </div>
    </div>
  );
}
