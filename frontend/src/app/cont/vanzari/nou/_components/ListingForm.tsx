"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { preload } from "react-dom";

import { Icons } from "@/components/icons";
import {
  Alert,
  Button,
  ButtonLink,
  Checkbox,
  CategoryIcon,
  FadeImage,
  Field,
  Illustration,
  Input,
  Modal,
  Slider,
  Textarea,
} from "@/components/ui";
import { createAuction } from "@/lib/api/auctions";
import { imageRefsFor, uploadImages } from "@/lib/api/uploads";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  AUCTION,
  AUCTION_CATEGORIES,
  DONATION,
  type AuctionCategoryId,
} from "@/lib/config";
import { useAction } from "@/lib/hooks/useApi";
import type { ProcessedImage } from "@/lib/images/process";
import { ITEM_CONDITION } from "@/lib/labels";
import { formatMoney, parseLeiInput } from "@/lib/money";
import type { AuctionDetail, CauseDetail, ItemCondition } from "@/lib/types";
import { scrollPageTo } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";
import { CausePicker } from "./CausePicker";
import { PhotoPicker } from "./PhotoPicker";
import { PickerRow } from "./PickerRow";

/**
 * The five states, best first, each with how many of the five bars it fills.
 *
 * <p>"Stare foarte bună" and "Stare bună" are one word apart and sit next to each other in a list;
 * the bars are what separate them at a glance, and they rank the list without numbering it.
 */
const CONDITIONS: { value: ItemCondition; label: string; level: number }[] = [
  { value: "NEW", label: ITEM_CONDITION.NEW, level: 5 },
  { value: "LIKE_NEW", label: ITEM_CONDITION.LIKE_NEW, level: 4 },
  { value: "VERY_GOOD", label: ITEM_CONDITION.VERY_GOOD, level: 3 },
  { value: "GOOD", label: ITEM_CONDITION.GOOD, level: 2 },
  { value: "USED", label: ITEM_CONDITION.USED, level: 1 },
];

const CONDITION_LEVELS = 5;

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

/**
 * The controls the page can be sent to, in the order they are read.
 *
 * <p>Not one per message: the two prices are filled in together and so are the cause and the
 * percentage, so each pair has a single row to land on.
 */
const ANCHOR_ORDER = [
  "images",
  "title",
  "description",
  "category",
  "parcel",
  "condition",
  "price",
  "donation",
  "ownership",
  "terms",
] as const;

type Anchor = (typeof ANCHOR_ORDER)[number];

const ANCHOR_OF: Record<keyof Errors, Anchor> = {
  images: "images",
  title: "title",
  description: "description",
  category: "category",
  parcel: "parcel",
  condition: "condition",
  startingPrice: "price",
  buyNowPrice: "price",
  causeId: "donation",
  donationPercent: "donation",
  ownershipConfirmed: "ownership",
  termsAccepted: "terms",
};

/** Fixed rather than generated, so the submit can find a control without waiting for a render. */
const anchorId = (name: Anchor) => `camp-${name}`;

/** Room above the field the page lands on, so it sits under the header rather than beneath it. */
const FIRST_ERROR_MARGIN_PX = 96;

/** How long the form takes to clear the page, matching `--animate-form-out`. */
const FORM_LEAVE_MS = 260;

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
 * The two prices, checked together because the second one only means anything against the first.
 *
 * <p>Shared with the modal they are typed in, so the message arrives while the reader is still
 * looking at the field rather than after the modal has closed over it.
 */
function validatePrices(startingText: string, buyNowText: string): Errors {
  const found: Errors = {};
  const startingPrice = parseLeiInput(startingText);
  const buyNowPrice = buyNowText ? parseLeiInput(buyNowText) : null;

  if (startingPrice === null) {
    found.startingPrice = "Introdu prețul de pornire.";
  } else if (startingPrice < AUCTION.MIN_STARTING_PRICE) {
    found.startingPrice = `Prețul de pornire trebuie să fie de cel puțin ${formatMoney(AUCTION.MIN_STARTING_PRICE)}.`;
  } else if (startingPrice > AUCTION.MAX_STARTING_PRICE) {
    found.startingPrice = `Prețul de pornire nu poate depăși ${formatMoney(AUCTION.MAX_STARTING_PRICE)}.`;
  }

  if (buyNowText && buyNowPrice === null) {
    found.buyNowPrice = "Introdu o sumă validă sau lasă câmpul gol.";
  } else if (
    buyNowPrice !== null &&
    startingPrice !== null &&
    buyNowPrice <= startingPrice
  ) {
    found.buyNowPrice =
      "Prețul de vânzare directă trebuie să fie mai mare decât prețul de pornire.";
  }

  return found;
}

/**
 * One box, read top to bottom: the photographs, the object, then what it is worth.
 *
 * <p>The four choices that need room to be made in — category, parcel, price, donation — are made
 * in modals and answered here in a line each. Laid out in the form they were nine tiles, three
 * tiles, two inputs and a rail of portraits, and the seller had to scroll past all of it to reach
 * the next thing to fill in.
 */
export function ListingForm() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [photos, setPhotos] = useState<ProcessedImage[]>([]);
  const [cause, setCause] = useState<CauseDetail | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [opened, setOpened] = useState<Anchor | null>(null);
  /** The listing, from the moment it exists. The form plays itself out on it. */
  const [created, setCreated] = useState<AuctionDetail | null>(null);
  /** And the screen that replaces it, once the form has finished leaving. */
  const [handedOver, setHandedOver] = useState(false);

  // Two states rather than one because the form has to still be on the page to
  // animate off it. Swapping the tree the moment the listing came back cut the
  // form off mid-frame and the success screen arrived out of nowhere.
  useEffect(() => {
    if (!created) return;
    const timer = window.setTimeout(() => setHandedOver(true), FORM_LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [created]);

  // The tiles only mount when a modal opens, and a drawing that starts loading
  // then arrives after the grid it belongs to. Nine files of about five
  // kilobytes each, fetched while the seller is still typing the title.
  for (const entry of AUCTION_CATEGORIES) {
    preload(`/images/illustrations/categories/${entry.id}.webp`, {
      as: "image",
    });
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    // The message goes the moment the field it belongs to changes. Leaving it up
    // while somebody types the fix is the form arguing with them.
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const setPhotographs = (next: ProcessedImage[]) => {
    setPhotos(next);
    setErrors((current) => ({ ...current, images: undefined }));
  };

  const parcel = AUCTION.PARCEL_TYPES.find(
    (entry) => entry.id === draft.parcel,
  );
  const category = AUCTION_CATEGORIES.find(
    (entry) => entry.id === draft.category,
  );
  const condition = CONDITIONS.find((entry) => entry.value === draft.condition);
  const startingPrice = parseLeiInput(draft.startingPrice);
  const buyNowPrice = draft.buyNowPrice
    ? parseLeiInput(draft.buyNowPrice)
    : null;

  /**
   * Everything that has to happen for a listing to exist, in the order it has to happen in.
   *
   * <p>The photographs go up first and separately. Sending them with the listing would mean a
   * request that can half-succeed — the row written, the pictures lost — and nothing to show the
   * seller for it. This way the listing is only ever created from stored objects that already have
   * an address, and a failed upload leaves the form exactly as it was, with everything still in it.
   */
  const publish = async (): Promise<AuctionDetail> => {
    const stored = await uploadImages(photos);

    return createAuction(
      {
        title: draft.title.trim(),
        description: draft.description.trim(),
        images: imageRefsFor(stored),
        category: draft.category as AuctionCategoryId,
        condition: draft.condition as ItemCondition,
        weightGrams: parcel!.weightGrams,
        causeId: draft.causeId,
        donationPercent: draft.donationPercent,
        startingPrice: startingPrice!,
        ...(buyNowPrice !== null ? { buyNowPrice } : {}),
      },
      user!.id,
    );
  };

  const submit = useAction(publish);

  const validate = (): Errors => {
    const found: Errors = {
      ...validatePrices(draft.startingPrice, draft.buyNowPrice),
    };

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

    const failed = Object.keys(found) as (keyof Errors)[];
    if (failed.length > 0) {
      // Straight to the first thing that needs attention rather than a list at
      // the top: on a phone the list and the field are never on screen together.
      //
      // Found by id rather than by querying for the invalid control, because
      // the attribute marking one comes from `errors`, which has not rendered
      // at this point. That query saw the state before this submit: the first
      // press scrolled nowhere, and every one after it went to whichever field
      // had been wrong the time before.
      const first = ANCHOR_ORDER.find((name) =>
        failed.some((key) => ANCHOR_OF[key] === name),
      );
      const target = first ? document.getElementById(anchorId(first)) : null;
      if (target) {
        // Through Lenis rather than scrollIntoView, which sets the position
        // directly and leaves Lenis animating towards a target it no longer
        // agrees with — the page then snaps back a frame later.
        scrollPageTo(target, { offset: -FIRST_ERROR_MARGIN_PX });
        target
          .querySelector<HTMLElement>("input, textarea, button")
          ?.focus({ preventScroll: true });
      }
      return;
    }

    const auction = await submit.run();
    if (auction) setCreated(auction);
  };

  if (handedOver && created) return <SubmittedScreen auction={created} />;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn(
        "flex flex-col gap-5",
        // On its way out, and no longer anybody's to press.
        created && "animate-form-out pointer-events-none",
      )}
    >
      <div className="flex flex-col rounded-3xl bg-white p-4 ring-1 ring-edge sm:p-6">
        <Section title="Fotografii" first>
          {/* No label over it: the section is called Fotografii and the slots
              are plainly photographs. */}
          <div id={anchorId("images")}>
            <PhotoPicker value={photos} onChange={setPhotographs} />
          </div>
          {errors.images ? <Message>{errors.images}</Message> : null}
        </Section>

        <Section title="Despre obiect">
          <div id={anchorId("title")}>
            <Field label="Titlu" error={errors.title} required>
              <Input
                value={draft.title}
                onChange={(event) => set("title", event.target.value)}
                maxLength={AUCTION.MAX_TITLE_LENGTH}
                placeholder="Numele obiectului"
              />
            </Field>
          </div>

          <div id={anchorId("description")}>
            <Field label="Detalii" error={errors.description} required>
              <Textarea
                value={draft.description}
                onChange={(event) => set("description", event.target.value)}
                maxLength={AUCTION.MAX_DESCRIPTION_LENGTH}
                rows={5}
                placeholder="Ce include, cum a fost folosit și orice detaliu util cumpărătorului."
              />
            </Field>
          </div>

          <div id={anchorId("category")}>
            <Field label="Categorie" error={errors.category} required>
              <PickerRow
                placeholder="Selectează categoria"
                filled={Boolean(category)}
                invalid={Boolean(errors.category)}
                onOpen={() => setOpened("category")}
              >
                {category ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CategoryIcon
                      set="categories"
                      id={category.id}
                      className="h-7 w-7 shrink-0"
                      sizes="28px"
                    />
                    <span className="truncate font-display text-sm font-extrabold text-ink-900">
                      {category.label}
                    </span>
                  </span>
                ) : null}
              </PickerRow>
            </Field>
          </div>

          <div id={anchorId("parcel")}>
            <Field label="Mărimea coletului" error={errors.parcel} required>
              <PickerRow
                placeholder="Selectează mărimea coletului"
                filled={Boolean(parcel)}
                invalid={Boolean(errors.parcel)}
                onOpen={() => setOpened("parcel")}
              >
                {parcel ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ParcelArt parcel={parcel} className="h-7 w-7" />
                    <span className="min-w-0">
                      <span className="block font-display text-sm font-extrabold text-ink-900">
                        {parcel.label}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {parcel.examples}
                      </span>
                    </span>
                  </span>
                ) : null}
              </PickerRow>
            </Field>
          </div>

          <div id={anchorId("condition")}>
            <Field label="Stare" error={errors.condition} required>
              <PickerRow
                placeholder="Selectează starea"
                filled={Boolean(condition)}
                invalid={Boolean(errors.condition)}
                onOpen={() => setOpened("condition")}
              >
                {condition ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ConditionBars level={condition.level} />
                    <span className="truncate font-display text-sm font-extrabold text-ink-900">
                      {condition.label}
                    </span>
                  </span>
                ) : null}
              </PickerRow>
            </Field>
          </div>
        </Section>

        <Section title="Preț & donație">
          <div id={anchorId("price")}>
            <Field
              label="Preț"
              error={errors.startingPrice ?? errors.buyNowPrice}
              required
            >
              <PickerRow
                placeholder="Stabilește prețul de pornire"
                filled={startingPrice !== null}
                invalid={Boolean(errors.startingPrice ?? errors.buyNowPrice)}
                onOpen={() => setOpened("price")}
              >
                <span className="min-w-0">
                  <span className="numeric block font-display text-sm font-extrabold text-ink-900">
                    De la {formatMoney(startingPrice ?? 0)}
                  </span>
                  {buyNowPrice !== null ? (
                    <span className="numeric block text-xs text-ink-500">
                      Vânzare directă {formatMoney(buyNowPrice)}
                    </span>
                  ) : null}
                </span>
              </PickerRow>
            </Field>
          </div>

          <div id={anchorId("donation")}>
            <Field label="Donație" error={errors.causeId} required>
              <PickerRow
                placeholder="Selectează cauza"
                filled={Boolean(cause)}
                invalid={Boolean(errors.causeId)}
                onOpen={() => setOpened("donation")}
              >
                {cause ? (
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-ink-100">
                      <FadeImage src={cause.imageUrl} sizes="36px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-extrabold text-ink-900">
                        {cause.name}
                      </span>
                      <span className="numeric block truncate text-xs text-ink-500">
                        {draft.donationPercent}% din prețul final
                      </span>
                    </span>
                  </span>
                ) : null}
              </PickerRow>
            </Field>
          </div>

          <div id={anchorId("ownership")} className="pt-1">
            <Checkbox
              checked={draft.ownershipConfirmed}
              onChange={(event) =>
                set("ownershipConfirmed", event.target.checked)
              }
              label="Confirm că obiectul îmi aparține și că am dreptul să îl vând și să îl expediez."
              description="Licitațiile pentru obiecte care nu aparțin vânzătorului sunt retrase din platformă."
            />
            {errors.ownershipConfirmed ? (
              <Message>{errors.ownershipConfirmed}</Message>
            ) : null}
          </div>

          <div id={anchorId("terms")}>
            <Checkbox
              checked={draft.termsAccepted}
              onChange={(event) => set("termsAccepted", event.target.checked)}
              label={
                <>
                  Accept <Legal href="/termeni">Termenii și Condițiile</Legal>{" "}
                  și{" "}
                  <Legal href="/confidentialitate">
                    Politica de confidențialitate
                  </Legal>
                  .
                </>
              }
              description="Suma încasată rămâne în escrow, iar procentul donat se virează cauzei după confirmarea livrării."
            />
            {errors.termsAccepted ? (
              <Message>{errors.termsAccepted}</Message>
            ) : null}
          </div>
        </Section>
      </div>

      {submit.error ? <Alert tone="danger">{submit.error}</Alert> : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={submit.pending}
        className="sm:w-auto sm:self-end"
      >
        Finalizează
      </Button>

      {opened === "category" ? (
        <CategoryModal
          value={draft.category}
          onClose={() => setOpened(null)}
          onPick={(value) => {
            set("category", value);
            setOpened(null);
          }}
        />
      ) : null}

      {opened === "parcel" ? (
        <ParcelModal
          value={draft.parcel}
          onClose={() => setOpened(null)}
          onPick={(value) => {
            set("parcel", value);
            setOpened(null);
          }}
        />
      ) : null}

      {opened === "condition" ? (
        <ConditionModal
          value={draft.condition}
          onClose={() => setOpened(null)}
          onPick={(value) => {
            set("condition", value);
            setOpened(null);
          }}
        />
      ) : null}

      {opened === "price" ? (
        <PriceModal
          startingPrice={draft.startingPrice}
          buyNowPrice={draft.buyNowPrice}
          onClose={() => setOpened(null)}
          onSave={(values) => {
            set("startingPrice", values.startingPrice);
            set("buyNowPrice", values.buyNowPrice);
            setOpened(null);
          }}
        />
      ) : null}

      {opened === "donation" ? (
        <DonationModal
          cause={cause}
          percent={draft.donationPercent}
          onClose={() => setOpened(null)}
          onSave={(values) => {
            setCause(values.cause);
            set("causeId", values.cause.id);
            set("donationPercent", values.percent);
            setOpened(null);
          }}
        />
      ) : null}
    </form>
  );
}

/**
 * A run of fields under a name.
 *
 * <p>One box for the whole form, divided by a rule rather than by a gap between panels: the seller
 * is filling in one thing, and two surfaces read as two of them. The rule says the subject
 * changed and the name says to what.
 */
function Section({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        !first && "mt-6 border-t border-line pt-6",
      )}
    >
      <h2 className="font-display text-base font-extrabold text-ink-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A document the reader is agreeing to. Stops the click so following it does not also tick the box. */
function Legal({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="font-bold text-primary-700 underline underline-offset-2 hover:text-primary-800"
    >
      {children}
    </Link>
  );
}

/** What `Field` prints under a control, for the three places that have no `Field` around them. */
function Message({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-danger-600"
    >
      <Icons.error className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

/** How much of the object's life is left, as five bars rather than as a place in a list. */
function ConditionBars({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
      {Array.from({ length: CONDITION_LEVELS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-5 w-2 rounded-full",
            index < level ? "bg-primary-500" : "bg-ink-200",
          )}
        />
      ))}
    </span>
  );
}

/** The five states as a column, because they are ranked and a row would not say so. */
function ConditionModal({
  value,
  onClose,
  onPick,
}: {
  value: ItemCondition | "";
  onClose: () => void;
  onPick: (value: ItemCondition) => void;
}) {
  return (
    <Modal open onClose={onClose} title="Stare">
      <div
        role="radiogroup"
        aria-label="Starea obiectului"
        className="flex flex-col gap-1.5"
      >
        {CONDITIONS.map((entry) => {
          const chosen = value === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onPick(entry.value)}
              className={cn(
                "flex items-center gap-3.5 rounded-2xl px-3.5 py-4 text-left transition",
                chosen
                  ? "bg-primary-50 ring-1 ring-primary-500"
                  : "bg-canvas hover:bg-white hover:ring-1 hover:ring-edge",
              )}
            >
              <ConditionBars level={entry.level} />
              <span className="font-display text-base font-extrabold text-ink-900">
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * The artwork once the files are in `public/images/illustrations`, the parcel icon until then.
 *
 * <p>The same square slot for all three, so the row is spaced and aligned identically whatever is
 * in it. How large each parcel is drawn is settled in the file rather than here: the medium one is
 * a wide box, and it is drawn on a canvas its own width so it fills the slot side to side instead
 * of being letterboxed into it and coming out visibly smaller than the other two.
 */
function ParcelArt({
  parcel,
  className,
}: {
  parcel: (typeof AUCTION.PARCEL_TYPES)[number];
  className: string;
}) {
  if (!parcel.illustration) {
    return (
      <Icons.parcel
        aria-hidden="true"
        className={cn(className, "shrink-0 text-ink-400")}
      />
    );
  }
  return (
    // Not through `Illustration`, which keeps its drawing inside its box: the
    // point of the scale below is to let this one out of it by a hair, and
    // clipped instead it would lose its edges.
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0", className)}
    >
      <Image
        src={`/images/illustrations/${parcel.illustration}.webp`}
        alt=""
        fill
        unoptimized
        loading="eager"
        sizes="64px"
        style={{ scale: parcel.illustrationScale }}
        className="object-contain"
        draggable={false}
      />
    </span>
  );
}

/**
 * A choice made by looking at pictures, given the width to be looked at in.
 *
 * <p>Closes on the tap that answers it. There is one thing to say here, and a footer asking the
 * reader to confirm the tile they have just pressed says nothing.
 *
 * <p>Two across on a phone: at three a tile leaves 88px for its label and "Artă & Handmade" wants
 * a hundred, so the longest names came out cut.
 */
function CategoryModal({
  value,
  onClose,
  onPick,
}: {
  value: AuctionCategoryId | "";
  onClose: () => void;
  onPick: (value: AuctionCategoryId) => void;
}) {
  return (
    <Modal open onClose={onClose} title="Categorie">
      <div
        role="radiogroup"
        aria-label="Categorie"
        className="grid grid-cols-3 gap-2"
      >
        {AUCTION_CATEGORIES.map((entry) => {
          const chosen = value === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onPick(entry.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl px-1 py-4 text-center transition",
                chosen
                  ? "bg-primary-50 ring-1 ring-primary-500"
                  : "bg-canvas hover:bg-white hover:ring-1 hover:ring-edge",
              )}
            >
              <CategoryIcon
                set="categories"
                id={entry.id}
                className="h-14 w-14"
                sizes="56px"
              />
              <span
                title={entry.label}
                className={cn(
                  "w-full truncate text-[11px] leading-none font-bold",
                  chosen ? "text-primary-900" : "text-ink-700",
                )}
              >
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/** The three easybox compartments, each named after something the whole parcel is the size of. */
function ParcelModal({
  value,
  onClose,
  onPick,
}: {
  value: Draft["parcel"];
  onClose: () => void;
  onPick: (value: Exclude<Draft["parcel"], "">) => void;
}) {
  return (
    <Modal open onClose={onClose} title="Mărimea coletului">
      <div
        role="radiogroup"
        aria-label="Mărimea coletului"
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {AUCTION.PARCEL_TYPES.map((parcel) => {
          const chosen = value === parcel.id;
          return (
            <button
              key={parcel.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onPick(parcel.id)}
              className={cn(
                "flex items-center gap-3.5 rounded-2xl px-3.5 py-4 text-left transition",
                "sm:flex-col sm:gap-2 sm:px-2 sm:py-4 sm:text-center",
                chosen
                  ? "bg-primary-50 ring-1 ring-primary-500"
                  : "bg-canvas hover:bg-white hover:ring-1 hover:ring-edge",
              )}
            >
              <ParcelArt
                parcel={parcel}
                className="h-11 w-11 sm:h-14 sm:w-14"
              />
              <span className="min-w-0">
                <span className="block font-display text-base font-extrabold text-ink-900">
                  {parcel.label}
                </span>
                <span className="mt-0.5 block text-xs leading-tight whitespace-nowrap text-ink-500">
                  {parcel.examples}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * Both prices, typed where they can be checked against each other.
 *
 * <p>Confirmed rather than committed on every keystroke, so a half-typed number never reaches the
 * form, and the message comparing the two is read beside the fields that caused it.
 */
function PriceModal({
  startingPrice,
  buyNowPrice,
  onClose,
  onSave,
}: {
  startingPrice: string;
  buyNowPrice: string;
  onClose: () => void;
  onSave: (values: { startingPrice: string; buyNowPrice: string }) => void;
}) {
  const [starting, setStarting] = useState(startingPrice);
  const [buyNow, setBuyNow] = useState(buyNowPrice);
  const [errors, setErrors] = useState<Errors>({});

  const save = () => {
    const found = validatePrices(starting, buyNow);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ startingPrice: starting, buyNowPrice: buyNow });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Preț"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button onClick={save}>Confirmă</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Preț de pornire" error={errors.startingPrice} required>
          <Input
            value={starting}
            onChange={(event) => {
              setStarting(event.target.value);
              setErrors((current) => ({
                ...current,
                startingPrice: undefined,
              }));
            }}
            inputMode="decimal"
            placeholder="0"
            trailing={<span className="text-sm text-ink-500">lei</span>}
          />
        </Field>

        <Field
          label="Preț de vânzare directă"
          error={errors.buyNowPrice}
          optionalLabel
        >
          <Input
            value={buyNow}
            onChange={(event) => {
              setBuyNow(event.target.value);
              setErrors((current) => ({ ...current, buyNowPrice: undefined }));
            }}
            inputMode="decimal"
            placeholder="—"
            trailing={<span className="text-sm text-ink-500">lei</span>}
          />
        </Field>
      </div>
    </Modal>
  );
}

/**
 * Who the money goes to and how much of it, in one place because it is one decision.
 *
 * <p>The presets answer the amount for most sellers; the range is there for whoever wants 35, and
 * only then. The percentage is written once — in the pressed preset, or in the range's own header
 * while it is open — because two live copies of one number invite the reader to check whether they
 * agree.
 */
function DonationModal({
  cause,
  percent,
  onClose,
  onSave,
}: {
  cause: CauseDetail | null;
  percent: number;
  onClose: () => void;
  onSave: (values: { cause: CauseDetail; percent: number }) => void;
}) {
  const [chosen, setChosen] = useState<CauseDetail | null>(cause);
  const [share, setShare] = useState(percent);
  const [custom, setCustom] = useState(
    !DONATION.PRESET_PERCENTS.some((preset) => preset === percent),
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Donație"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anulează
          </Button>
          <Button
            disabled={!chosen}
            onClick={() => {
              if (chosen) onSave({ cause: chosen, percent: share });
            }}
          >
            Confirmă
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CausePicker value={chosen?.id ?? ""} onChange={setChosen} />

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <span className="font-display text-sm font-bold text-ink-600">
            Procentul donat
          </span>

          <div className="flex flex-wrap gap-1.5">
            {DONATION.PRESET_PERCENTS.map((preset) => {
              const pressed = !custom && share === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => {
                    setCustom(false);
                    setShare(preset);
                  }}
                  className={cn(
                    "numeric rounded-full px-3.5 py-1.5 text-sm font-bold transition",
                    pressed
                      ? "bg-primary-600 text-white"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200",
                  )}
                >
                  {preset}%
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
              only ever animate in, and vanishes on the way out.

              `inert` while closed, because a collapsed row still holds a
              focusable range input: tabbing into one lands the caret somewhere
              nobody can see. */}
          <div
            aria-hidden={!custom}
            inert={!custom}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)]",
              custom
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              {/* Slack around the slider, because the clip is a scroll container
                  and the browser scrolls the range input into it on focus. The
                  thumb grows past its track on press, and that single pixel of
                  overflow was enough to shunt the panel upward on first click. */}
              <div
                className={cn(
                  "px-0.5 pt-3 pb-1.5 transition-transform duration-300 ease-[var(--ease-out-soft)]",
                  custom ? "translate-y-0" : "-translate-y-1",
                )}
              >
                <Slider
                  label="Procent donat"
                  value={share}
                  min={DONATION.MIN_PERCENT}
                  max={DONATION.MAX_PERCENT}
                  step={5}
                  onChange={setShare}
                  formatValue={(value) => `${value}%`}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-ink-500">
            Suma ajunge la cauză după confirmarea livrării.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * What happens after the send, which is not "it is live".
 *
 * <p>The listing is in review, and the one thing a seller wants to know is when it stops being in
 * review and where to look. Both are here, and the link goes to the page that will show it.
 */
/**
 * What is left on the page once the form has gone.
 *
 * <p>It arrives in the order it would be read in — the mark, then what happened, then what happens
 * next, then what to do about it — rather than all at once. Each part is a beat behind the one
 * above it, which is short enough that nobody waits for it and long enough that the screen assembles
 * itself instead of appearing.
 *
 * <p>The first button goes to the listing itself in the seller's own panel. It is not public yet, so
 * there is nowhere else it could go, and "Vânzările mele" alone left them to find it.
 */
function SubmittedScreen({ auction }: { auction: AuctionDetail }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      {/* Drop a replacement at this path and it is swapped, with nothing else
          to change: the box is fixed and the drawing is drawn to fit it. */}
      <Illustration
        src="listing-submitted"
        sizes="128px"
        className="animate-pop-in h-28 w-28 sm:h-32 sm:w-32"
      />

      <div>
        <h1
          className="animate-fade-up font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
          style={{ animationDelay: "80ms" }}
        >
          Anunțul a plecat spre verificare
        </h1>
        <p
          className="animate-fade-up mx-auto mt-2 max-w-md text-ink-600"
          style={{ animationDelay: "160ms" }}
        >
          <strong className="text-ink-900">{auction.title}</strong> este acum în
          verificare. Ne uităm peste el în scurt timp și îți scriem imediat ce
          devine public. Până atunci îl găsești, cu tot cu fotografii, în
          Vânzările mele — de unde îl poți și retrage.
        </p>
      </div>

      <div
        className="animate-fade-up flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:justify-center"
        style={{ animationDelay: "240ms" }}
      >
        <ButtonLink href={`/cont/vanzari?nou=${auction.id}`} size="lg">
          Vezi anunțul
        </ButtonLink>
        <ButtonLink href="/cont/vanzari/nou" variant="secondary" size="lg">
          Adaugă altă licitație
        </ButtonLink>
      </div>
    </div>
  );
}
