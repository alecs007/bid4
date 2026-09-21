import type { Metadata } from "next";
import { Icons, type IconName } from "@/components/icons";
import {
  Alert,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  DonationBadge,
  EmptyState,
  ErrorState,
  FeeBreakdown,
  GoalProgress,
  IconBubble,
  Logo,
  Mascot,
  MetaChip,
  ProgressBar,
  ShippingLabelPreview,
  Skeleton,
  SkeletonAuctionCard,
  SkeletonRows,
  Stat,
  StatInline,
  StatusBadge,
  UnreadBadge,
} from "@/components/ui";
import {
  AUCTION_STATUS,
  BID_STATUS,
  CAUSE_STATUS,
  ORDER_STATUS,
  USER_ROLE,
} from "@/lib/labels";
import { SHIPPING, SHIPPING_PRICES } from "@/lib/config";
import { computeFees, formatMoney, lei } from "@/lib/money";
import type { ShippingLabelData } from "@/lib/types";
import { isoAgo } from "@/lib/utils/date";
import {
  ButtonStatesDemo,
  ConfettiDemo,
  FormPlayground,
  ModalDemo,
  SegmentedDemo,
  ToastDemo,
} from "./_components/Playground";
import { PageTransition } from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "Design system",
  description: "Componentele și tokenurile vizuale ale platformei bid4.",
  robots: { index: false, follow: false },
};

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-extrabold text-ink-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-ink-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const PALETTE: { name: string; token: string; hex: string; note?: string }[][] = [
  [
    { name: "primary-500", token: "bg-primary-500", hex: "#58cc02", note: "brand" },
    {
      name: "primary-600",
      token: "bg-primary-600",
      hex: "#35870f",
      note: "text alb 4,5:1",
    },
    { name: "primary-700", token: "bg-primary-700", hex: "#2f7a14", note: "muchie 3D" },
    { name: "primary-100", token: "bg-primary-100", hex: "#e3f8cf" },
  ],
  [
    { name: "accent-500", token: "bg-accent-500", hex: "#ff6b4a", note: "brand" },
    {
      name: "accent-600",
      token: "bg-accent-600",
      hex: "#d64020",
      note: "text alb 4,6:1",
    },
    { name: "accent-700", token: "bg-accent-700", hex: "#b93518", note: "muchie 3D" },
    { name: "accent-100", token: "bg-accent-100", hex: "#ffe1d8" },
  ],
  [
    { name: "sky-400", token: "bg-sky-400", hex: "#38bdf8" },
    { name: "sky-600", token: "bg-sky-600", hex: "#0c7cb4", note: "text alb 4,6:1" },
    { name: "sun-400", token: "bg-sun-400", hex: "#ffc93c", note: "doar text ink" },
    { name: "sun-100", token: "bg-sun-100", hex: "#fff3c6" },
  ],
  [
    { name: "cream", token: "bg-canvas", hex: "#fbf8f3", note: "fundal app" },
    { name: "ink-100", token: "bg-ink-100", hex: "#eceae5" },
    { name: "ink-600", token: "bg-ink-600", hex: "#5c6b62", note: "text secundar" },
    { name: "ink-900", token: "bg-ink-900", hex: "#1f2a24", note: "text principal" },
  ],
  [
    { name: "success-600", token: "bg-success-600", hex: "#0e7a3c" },
    { name: "warning-500", token: "bg-warning-500", hex: "#f5b301" },
    { name: "danger-600", token: "bg-danger-600", hex: "#c92a2a" },
    { name: "white", token: "bg-white", hex: "#ffffff" },
  ],
];

const SAMPLE_LABEL: ShippingLabelData = {
  awb: "2SD4471900238104",
  courier: SHIPPING.COURIER_NAME,
  serviceName: SHIPPING.SERVICE_NAME,
  qrPayload: `${SHIPPING.TRACKING_URL_BASE}/2SD4471900238104`,
  trackingUrl: `${SHIPPING.TRACKING_URL_BASE}/2SD4471900238104`,
  orderId: "ord_2417",
  orderReference: "CMD-2026-0417",
  deliveryType: "EASYBOX",
  lockerId: "BUC-142",
  lockerName: "Easybox Auchan Titan",
  sender: {
    name: "Andrei Popescu",
    phone: "0721 004 118",
    addressLines: ["Str. Zorilor 14, ap. 3", "Cluj-Napoca, Cluj", "400172"],
  },
  recipient: {
    name: "Maria Ionescu",
    phone: "0745 220 907",
    addressLines: ["Bd. 1 Decembrie 1918 nr. 33", "București, Sector 3", "032468"],
  },
  weightGrams: 850,
  itemTitle: "Aparat foto Canon AE-1 Program, film 35mm, cu obiectiv 50mm",
  issuedAt: isoAgo(2, "hours"),
  donationNote:
    "Din această comandă, 128,00 lei merg către Împreună pentru Ana.",
};

export default function DesignSystemPage() {
  const buyerFees = computeFees({
    finalPrice: lei(320),
    donationPercent: 40,
    shipping: SHIPPING_PRICES.EASYBOX,
  });
  const sellerFees = computeFees({ finalPrice: lei(320), donationPercent: 40 });

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-12 flex flex-col gap-6 rounded-4xl bg-white ring-1 ring-edge p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo size="lg" href={null} />
            <Badge tone="sky" variant="soft">
              Design system v1
            </Badge>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Mascot mood="cheer" size={96} floating />
            <div>
              <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
                Licitezi. Câștigi. Ajuți.
              </h1>
              <p className="mt-2 max-w-2xl text-lg text-ink-600">
                Fundația vizuală a platformei bid4: culori verificate pentru
                contrast, tipografie prietenoasă, butoane cu muchie 3D și
                componentele de business, de la countdown la eticheta de
                expediere.
              </p>
            </div>
          </div>
        </header>
        <div className="flex flex-col gap-14">
          <Section
            id="culori"
            title="Culori"
            description="Fiecare suprafață plină care poartă text alb are contrast ≥ 4,5:1. Galbenul poartă doar text închis."
          >
            <div className="flex flex-col gap-3">
              {PALETTE.map((row, index) => (
                <div key={index} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {row.map((swatch) => (
                    <div
                      key={swatch.name}
                      className="overflow-hidden rounded-2xl border border-line"
                    >
                      <div className={`h-16 ${swatch.token}`} />
                      <div className="bg-white px-3 py-2">
                        <p className="font-display text-sm font-bold text-ink-900">
                          {swatch.name}
                        </p>
                        <p className="numeric text-xs text-ink-500">
                          {swatch.hex}
                          {swatch.note ? ` · ${swatch.note}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
          <Section
            id="tipografie"
            title="Tipografie"
            description="Baloo 2 pentru titluri (rotund, prietenos), Nunito pentru text. Ambele includ diacriticele românești."
          >
            <Card>
              <p className="font-display text-4xl font-extrabold text-ink-900">
                Șase căței îmi țin în frâu
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink-900">
                Titlu secundar · Baloo 2 Bold
              </p>
              <p className="mt-3 text-lg text-ink-700">
                Text mare de introducere, Nunito Regular. Fiecare ofertă pe care o
                plasezi ajunge, în parte, la o cauză verificată.
              </p>
              <p className="mt-2 text-ink-600">
                Text de bază 16px. Ăsta e paragraful obișnuit, cu ș, ț, ă, î și â.
              </p>
              <p className="mt-2 text-sm text-ink-500">
                Text mic 14px pentru detalii secundare și explicații.
              </p>
              <p className="numeric mt-3 font-display text-2xl font-extrabold text-primary-700">
                1.250,00 lei · cifre tabulare
              </p>
            </Card>
          </Section>
          <Section
            id="butoane"
            title="Butoane"
            description="Muchie inferioară solidă care se comprimă la apăsare. Apasă-le și se mișcă."
          >
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Variante" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Licitează acum</Button>
                  <Button variant="accent">Donează 100%</Button>
                  <Button variant="sky">Vezi cauza</Button>
                  <Button variant="sun">Salvează ciorna</Button>
                  <Button variant="danger">Retrage anunțul</Button>
                  <Button variant="secondary">Anulează</Button>
                  <Button variant="ghost">Mai târziu</Button>
                  <Button variant="link">Cum funcționează?</Button>
                </div>
              </Card>
              <Card>
                <CardHeader title="Dimensiuni și stări" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra large</Button>
                  <Button disabled>Dezactivat</Button>
                  <ButtonStatesDemo />
                  <ButtonLink href="/design-system" variant="secondary">
                    Ca link
                  </ButtonLink>
                  <Button
                    iconOnly
                    variant="secondary"
                    aria-label="Adaugă la favorite"
                  >
                    <Icons.impact aria-hidden="true" className="h-5 w-5 shrink-0" />
                  </Button>
                </div>
                <div className="mt-4">
                  <Button fullWidth size="lg" variant="primary">
                    Buton pe toată lățimea
                  </Button>
                </div>
              </Card>
            </div>
          </Section>
          <Section
            id="badge-uri"
            title="Badge-uri și stări"
            description="Fiecare stare din domeniu are o singură etichetă și o singură culoare, definite în lib/labels.ts."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader title="Licitații" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AUCTION_STATUS).map(([key, meta]) => (
                    <StatusBadge
                      key={key}
                      meta={meta}
                      pulse={key === "LIVE"}
                    />
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="Comenzi" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ORDER_STATUS).map(([key, meta]) => (
                    <StatusBadge key={key} meta={meta} size="sm" />
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="Cauze, oferte, roluri" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CAUSE_STATUS).map(([key, meta]) => (
                    <StatusBadge key={key} meta={meta} size="sm" />
                  ))}
                  {Object.entries(BID_STATUS).map(([key, meta]) => (
                    <StatusBadge key={key} meta={meta} size="sm" />
                  ))}
                  {Object.entries(USER_ROLE).map(([key, meta]) => (
                    <StatusBadge key={key} meta={meta} variant="solid" size="sm" />
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader
                  title="Necitite"
                  subtitle="Un disc pentru o cifră, o pastilă abia de la două."
                />
                <div className="flex flex-wrap items-center gap-3">
                  {[1, 7, 12, 99, 128].map((count) => (
                    <UnreadBadge
                      key={count}
                      count={count}
                      tone="bg-primary-600 text-white"
                    />
                  ))}
                  {[1, 7, 12].map((count) => (
                    <span
                      key={`xs-${count}`}
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-ink-700"
                    >
                      <Icons.inbox aria-hidden="true" className="h-5 w-5" />
                      <UnreadBadge
                        count={count}
                        size="xs"
                        max={9}
                        tone="bg-danger-600 text-white ring-2 ring-white"
                        className="absolute top-1 right-1"
                      />
                    </span>
                  ))}
                </div>
              </Card>
              <Card>
                <CardHeader
                  title="Donație"
                  subtitle="Cât din vânzare devine ajutor."
                />
                <div className="flex flex-wrap gap-2">
                  <DonationBadge percent={10} />
                  <DonationBadge percent={25} />
                  <DonationBadge percent={50} />
                  <DonationBadge percent={80} />
                  <DonationBadge percent={100} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaChip icon={<Icons.rating className="h-3.5 w-3.5" />}>
                    4,9 din 37 evaluări
                  </MetaChip>
                  <MetaChip icon={<Icons.locker className="h-3.5 w-3.5" />}>
                    Easybox Titan
                  </MetaChip>
                  <MetaChip>Stare foarte bună</MetaChip>
                  <MetaChip icon={<Icons.auction className="h-3.5 w-3.5" />}>
                    14 oferte
                  </MetaChip>
                </div>
              </Card>
            </div>
          </Section>
          <Section
            id="carduri"
            title="Carduri, statistici, avatare"
            description="Colțuri rotunjite generoase, inel subtil în loc de umbre dure, ridicare la hover."
          >
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  icon={<Icons.donation aria-hidden="true" className="h-5 w-5 shrink-0" />}
                  value={formatMoney(lei(482_150), { compact: true })}
                  label="Strânse pentru cauze"
                  hint="de la lansare"
                />
                <Stat
                  tone="accent"
                  icon={<Icons.auction aria-hidden="true" className="h-5 w-5 shrink-0" />}
                  value="1.284"
                  label="Licitații încheiate"
                />
                <Stat
                  tone="sky"
                  icon={<Icons.members aria-hidden="true" className="h-5 w-5 shrink-0" />}
                  value="6.902"
                  label="Membri activi"
                />
                <Stat
                  tone="sun"
                  icon={<Icons.parcel aria-hidden="true" className="h-5 w-5 shrink-0" />}
                  value="98%"
                  label="Comenzi livrate la timp"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Card>
                  <IconBubble tone="primary" size="lg">
                    🌱
                  </IconBubble>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink-900">
                    Card standard
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    Suprafață albă, contur subțire. Culoarea intră prin cip-ul de
                    icon, nu prin fundal.
                  </p>
                </Card>
                <Card interactive>
                  <CardHeader
                    title="Card interactiv"
                    subtitle="Se ridică la hover"
                    icon={<IconBubble tone="sky">📦</IconBubble>}
                  />
                  <GoalProgress raised={lei(18_400)} goal={lei(25_000)} compact />
                </Card>
                <Card>
                  <CardHeader title="Oameni" subtitle="Avatare și grupuri" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name="Maria Ionescu" size="lg" />
                    <Avatar
                      name="Asociația Zâmbet"
                      accountType="ORGANIZATION"
                      size="lg"
                      verified
                    />
                    <AvatarStack
                      size="md"
                      people={[
                        { name: "Ana P" },
                        { name: "Bogdan R" },
                        { name: "Carmen T" },
                        { name: "Dan V" },
                        { name: "Elena M" },
                      ]}
                    />
                  </div>
                </Card>
              </div>
              <Card surface="subtle" padded="lg">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <StatInline value="12.480" label="Oferte plasate" />
                  <StatInline value="43" label="Cauze active" />
                  <StatInline
                    value={formatMoney(lei(96_300), { compact: true })}
                    label="Luna aceasta"
                  />
                  <StatInline value="4,9★" label="Rating mediu" />
                </div>
              </Card>
            </div>
          </Section>
          <Section
            id="progres"
            title="Progres către obiectiv"
            description="Momentul în care o cauză își atinge ținta merită sărbătorit."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <Card>
                <GoalProgress raised={lei(6_200)} goal={lei(25_000)} />
              </Card>
              <Card>
                <GoalProgress raised={lei(19_900)} goal={lei(25_000)} tone="sky" />
              </Card>
              <Card>
                <GoalProgress raised={lei(26_100)} goal={lei(25_000)} />
              </Card>
            </div>
            <Card className="mt-5">
              <CardHeader title="Bare simple" />
              <div className="flex flex-col gap-3">
                <ProgressBar value={25} size="sm" label="Exemplu 25%" />
                <ProgressBar value={60} tone="accent" label="Exemplu 60%" />
                <ProgressBar value={90} tone="sky" size="lg" label="Exemplu 90%" />
              </div>
            </Card>
          </Section>
          <Section
            id="comisioane"
            title="Împărțirea banilor"
            description="O singură implementare (lib/money.ts), trei perspective. Apare pe pagina licitației, la confirmare și pe comandă."
          >
            <div className="grid gap-5 lg:grid-cols-3">
              <FeeBreakdown
                breakdown={buyerFees}
                perspective="BUYER"
                causeName="Împreună pentru Ana"
              />
              <FeeBreakdown
                breakdown={sellerFees}
                perspective="SELLER"
                causeName="Împreună pentru Ana"
                showExplainer={false}
              />
              <FeeBreakdown
                breakdown={buyerFees}
                perspective="FULL"
                causeName="Împreună pentru Ana"
                showExplainer={false}
              />
            </div>
          </Section>
          <Section
            id="formulare"
            title="Formulare"
            description="Etichete, explicații și erori legate automat prin aria-describedby. Toate câmpurile au stare de focus vizibilă."
          >
            <Card padded="lg">
              <FormPlayground />
            </Card>
          </Section>
          <Section
            id="feedback"
            title="Mesaje, stări goale și încărcare"
            description="Fiecare ecran are o stare goală încurajatoare, o stare de eroare cu reîncercare și un schelet de încărcare."
          >
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 md:grid-cols-2">
                <Alert tone="primary" title="Ești cel mai bun ofertant!">
                  Îți ținem pumnii. Te anunțăm dacă cineva te depășește.
                </Alert>
                <Alert tone="sun" title="Oferta ta a fost depășită">
                  Altcineva a oferit mai mult. Poți trimite o ofertă mai mare.
                </Alert>
                <Alert tone="sky" title="Fonduri în siguranță">
                  Banii sunt păstrați de bid4 până la finalizarea comenzii.
                </Alert>
                <Alert tone="danger" title="Plata a fost refuzată">
                  Banca a respins tranzacția. Încearcă alt card în următoarele 24h.
                </Alert>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <EmptyState
                  title="Nicio ofertă încă"
                  description="Când licitezi, o să găsești aici toate ofertele tale active."
                  action={<Button variant="primary">Descoperă licitații</Button>}
                />
                <ErrorState
                  action={<Button variant="secondary">Încearcă din nou</Button>}
                />
              </div>
              <Card>
                <CardHeader title="Schelete de încărcare" />
                <div className="grid gap-5 md:grid-cols-2">
                  <SkeletonAuctionCard />
                  <div className="flex flex-col gap-4">
                    <SkeletonRows count={3} />
                    <Skeleton className="h-11 w-40 rounded-2xl" />
                  </div>
                </div>
              </Card>
            </div>
          </Section>
          <Section
            id="interactiune"
            title="Interacțiuni"
            description="Dialog accesibil, filtre segmentate, notificări pentru acțiuni și momentul de sărbătoare."
          >
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <SegmentedDemo />
                <ModalDemo />
                <ConfettiDemo />
                <ToastDemo />
              </div>
            </Card>
          </Section>
          <Section
            id="mascota"
            title="Mascota"
            description="Frunzel, o inimă cu mugur. Apare rar: stări goale, victorii, onboarding."
          >
            <Card>
              <div className="flex flex-wrap items-end gap-8">
                {(["happy", "cheer", "thinking", "sad"] as const).map((mood) => (
                  <div key={mood} className="text-center">
                    <Mascot mood={mood} size={88} />
                    <p className="mt-2 text-sm font-bold text-ink-700">{mood}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
          <Section
            id="iconite"
            title="Iconițe"
            description="Toate iconițele trec printr-un registru unic, components/icons. Înlocuiește o intrare cu propriul SVG și se schimbă peste tot, dintr-un singur loc."
          >
            <Card>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {(Object.keys(Icons) as IconName[]).map((name) => {
                  const Glyph = Icons[name];
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-edge px-3 py-2.5"
                    >
                      <Glyph
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-ink-700"
                      />
                      <span className="truncate font-mono text-xs text-ink-600">
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-ink-600">
                Cele două iconițe desenate de mână, <code className="font-mono text-xs">donation</code>{" "}
                și <code className="font-mono text-xs">parcel</code>, sunt șablonul:
                copiază forma lor, schimbă traseele și păstrează{" "}
                <code className="font-mono text-xs">currentColor</code>, ca mărimea
                și culoarea să rămână în grija componentei care le folosește.
              </p>
            </Card>
          </Section>
          <Section
            id="eticheta"
            title="Eticheta de expediere"
            description="100 × 150 mm, cu QR, cod AWB și locker destinație. Butonul generează exact acest layout ca PDF, în browser."
          >
            <Card padded="lg">
              <ShippingLabelPreview data={SAMPLE_LABEL} />
            </Card>
          </Section>
        </div>
      </div>
    </PageTransition>
  );
}
