import { AUCTION, type ProductCategoryId } from "@/lib/config";
import { lei } from "@/lib/money";
import type {
  Auction,
  AuctionStatus,
  Bid,
  Product,
  ProductCondition,
} from "@/lib/types";
import { isoAgo, isoIn } from "@/lib/utils/date";
import { productGallery } from "../images";

/**
 * The catalogue: one blueprint per listing, expanded into a Product, an
 * Auction and (where it makes sense) a bid history.
 *
 * `timing` decides where an auction sits relative to now, so the seeded world
 * always contains something ending in a minute, something ending tomorrow and
 * a shelf of finished sales — without hard-coding dates that go stale.
 */
type Timing =
  | "ENDING_SECONDS" // inside the anti-snipe window right now
  | "ENDING_MINUTES" // last few minutes
  | "ENDING_HOURS" // later today
  | "ENDING_DAYS" // comfortable
  | "SCHEDULED" // not started yet
  | "FINISHED" // clock ran out
  | "STATIC"; // draft / review / cancelled: dates do not matter

interface ListingSeed {
  key: string;
  title: string;
  description: string;
  category: ProductCategoryId;
  condition: ProductCondition;
  weightGrams: number;
  sellerId: string;
  causeId: string;
  donationPercent: number;
  startLei: number;
  incrementLei?: number;
  reserveLei?: number;
  timing: Timing;
  status: AuctionStatus;
  /** How many bids to synthesise. Ignored for drafts and scheduled listings. */
  bids?: number;
  winnerId?: string;
  /** Marks the listings the order seed attaches to. */
  orderKey?: string;
}

const LISTINGS: ListingSeed[] = [
  /* -------------------------------------- live, inside the anti-snipe window */
  {
    key: "tricou-retro",
    title: "Tricou retro Steaua București, ediție aniversară",
    description:
      "Replică oficială a echipamentului din 1986, mărimea L. Nepurtat, cu etichetă. Ultimele minute de licitație: orice ofertă acum prelungește timpul cu două minute.",
    category: "moda",
    condition: "NEW",
    weightGrams: 320,
    sellerId: "usr_alexandra",
    causeId: "cau_ferentari",
    donationPercent: 65,
    startLei: 90,
    incrementLei: 10,
    timing: "ENDING_SECONDS",
    status: "LIVE",
    bids: 13,
  },

  /* ------------------------------------------------ live, ending very soon */
  {
    key: "canon",
    title: "Aparat foto Canon AE-1 Program cu obiectiv 50mm f/1.8",
    description:
      "Aparat pe film din 1983, complet funcțional. Perdele de obturator schimbate anul trecut, fotometru calibrat. Vine cu curea originală și capac de obiectiv. Am tras două filme cu el luna trecută și rezultatele sunt superbe.",
    category: "electronice",
    condition: "VERY_GOOD",
    weightGrams: 850,
    sellerId: "usr_vlad",
    causeId: "cau_ana",
    donationPercent: 40,
    startLei: 250,
    incrementLei: 10,
    reserveLei: 400,
    timing: "ENDING_MINUTES",
    status: "LIVE",
    bids: 14,
  },
  {
    key: "vinil",
    title: "Colecție 12 discuri vinil rock românesc anii '70–'80",
    description:
      "Phoenix, Sfinx, Iris, Semnal M și altele. Toate în coperți originale, verificate una câte una. Trei sunt aproape fără zgârieturi, restul au uzură normală de epocă. Se vând ca lot.",
    category: "colectii",
    condition: "GOOD",
    weightGrams: 2400,
    sellerId: "usr_bogdan",
    causeId: "cau_labute",
    donationPercent: 60,
    startLei: 180,
    incrementLei: 10,
    timing: "ENDING_MINUTES",
    status: "LIVE",
    bids: 9,
  },

  /* --------------------------------------------------- live, ending today */
  {
    key: "bicicleta",
    title: "Bicicletă de oraș Pegas Clasic, cadru 54",
    description:
      "Pegas Clasic restaurat complet: cadru revopsit, rulmenți noi, cauciucuri Schwalbe noi. Are coș față și apărători. Perfectă pentru navetă prin oraș. Se ridică din Brașov sau se trimite prin curier, demontată parțial.",
    category: "sport",
    condition: "VERY_GOOD",
    weightGrams: 14_000,
    sellerId: "usr_radu",
    causeId: "cau_padure",
    donationPercent: 30,
    startLei: 400,
    incrementLei: 25,
    reserveLei: 650,
    timing: "ENDING_HOURS",
    status: "LIVE",
    bids: 11,
  },
  {
    key: "rochie",
    title: "Rochie de seară din mătase naturală, mărimea M",
    description:
      "Purtată o singură dată, la o nuntă. Mătase 100%, croi pe bie, culoare verde smarald. Curățată chimic, vine pe umeraș și în husă. Lungime 132 cm.",
    category: "moda",
    condition: "LIKE_NEW",
    weightGrams: 600,
    sellerId: "usr_alexandra",
    causeId: "cau_ghiozdane",
    donationPercent: 50,
    startLei: 150,
    incrementLei: 10,
    timing: "ENDING_HOURS",
    status: "LIVE",
    bids: 7,
  },
  {
    key: "ilustratie",
    title: "Ilustrație originală în acuarelă, „Pisici pe acoperiș”",
    description:
      "Lucrare originală, acuarelă pe hârtie Fabriano 300g, 30×40 cm. Semnată și datată. Se livrează în tub rigid, neînrămată. 100% din preț merge la adăpost, nu păstrez nimic.",
    category: "arta",
    condition: "NEW",
    weightGrams: 400,
    sellerId: "usr_ioana",
    causeId: "cau_labute",
    donationPercent: 100,
    startLei: 200,
    incrementLei: 20,
    timing: "ENDING_HOURS",
    status: "LIVE",
    bids: 16,
  },

  /* ---------------------------------------------------- live, a few days */
  {
    key: "lego",
    title: "LEGO Technic 42096 Porsche 911 RSR, complet",
    description:
      "Set complet, verificat piesă cu piesă după listă. Are toate instrucțiunile și cutia originală. A stat expus, nu jucat. 1580 de piese.",
    category: "jucarii",
    condition: "LIKE_NEW",
    weightGrams: 1800,
    sellerId: "usr_alexandra",
    causeId: "cau_autism",
    donationPercent: 75,
    startLei: 300,
    incrementLei: 20,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 8,
  },
  {
    key: "carti",
    title: "Lot 30 de cărți pentru copii 6–10 ani, stare foarte bună",
    description:
      "Colecție strânsă în cinci ani: povești, primele romane, cărți ilustrate. Toate cu coperți întregi, fără pagini lipsă. Ideale pentru o bibliotecă de clasă sau pentru un început de bibliotecă acasă.",
    category: "carti",
    condition: "VERY_GOOD",
    weightGrams: 7500,
    sellerId: "usr_elena",
    causeId: "cau_biblioteca",
    donationPercent: 100,
    startLei: 90,
    incrementLei: 10,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 12,
  },
  {
    key: "espressor",
    title: "Espressor manual De'Longhi Dedica EC685",
    description:
      "Folosit doi ani, detartrat regulat, funcționează impecabil. Include tamper metalic și două filtre. Am trecut pe cafea filtru, de asta îl vând.",
    category: "casa",
    condition: "GOOD",
    weightGrams: 4200,
    sellerId: "usr_mihai",
    causeId: "cau_bunici",
    donationPercent: 25,
    startLei: 250,
    incrementLei: 25,
    reserveLei: 400,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 5,
  },
  {
    key: "ceas",
    title: "Ceas mecanic Poljot de colecție, anii '70",
    description:
      "Mecanism cu remontare manuală, revizuit de ceasornicar în martie. Merge cu o abatere de ~20 secunde pe zi. Curea de piele nouă, cea originală inclusă.",
    category: "bijuterii",
    condition: "GOOD",
    weightGrams: 200,
    sellerId: "usr_bogdan",
    causeId: "cau_ambulanta",
    donationPercent: 35,
    startLei: 320,
    incrementLei: 20,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 6,
  },
  {
    key: "cort",
    title: "Cort Vaude 3 persoane, folosit de trei ori",
    description:
      "Coloană de apă 3000 mm, montaj în 5 minute, greutate 3,1 kg. Are toate țărușii și husa de compresie. Am trecut la un cort de două persoane.",
    category: "sport",
    condition: "LIKE_NEW",
    weightGrams: 3400,
    sellerId: "usr_radu",
    causeId: "cau_padure",
    donationPercent: 50,
    startLei: 380,
    incrementLei: 20,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 4,
  },
  {
    key: "masina-cusut",
    title: "Mașină de cusut Singer Tradition 2250",
    description:
      "10 tipuri de cusături, butonieră în 4 pași. Funcționează perfect, are pedala și husa. Vine cu un set de ace și 12 mosoare.",
    category: "casa",
    condition: "GOOD",
    weightGrams: 6800,
    sellerId: "usr_elena",
    causeId: "cau_ferentari",
    donationPercent: 45,
    startLei: 220,
    incrementLei: 20,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 3,
  },
  {
    key: "ghiozdan",
    title: "Ghiozdan ergonomic Herlitz, nefolosit",
    description:
      "Cumpărat anul trecut, copilul a primit altul cadou. Complet nou, cu etichete. Include penar și sac de sport din aceeași colecție.",
    category: "jucarii",
    condition: "NEW",
    weightGrams: 1200,
    sellerId: "usr_alexandra",
    causeId: "cau_ghiozdane",
    donationPercent: 100,
    startLei: 80,
    incrementLei: 5,
    timing: "ENDING_DAYS",
    status: "LIVE",
    bids: 10,
  },

  /* ----------------------------------------------------------- scheduled */
  {
    key: "chitara",
    title: "Chitară clasică Yamaha C40, cu husă",
    description:
      "Chitară de studiu în stare bună, corzi noi. Ideală pentru început. Licitația pornește vineri.",
    category: "colectii",
    condition: "GOOD",
    weightGrams: 2600,
    sellerId: "usr_vlad",
    causeId: "cau_autism",
    donationPercent: 60,
    startLei: 180,
    incrementLei: 10,
    timing: "SCHEDULED",
    status: "SCHEDULED",
  },
  {
    key: "tablou",
    title: "Tablou în ulei pe pânză, peisaj de toamnă, 50×70",
    description:
      "Lucrare originală semnată, înrămată în lemn masiv. Se ridică personal din Iași sau se trimite cu asigurare.",
    category: "arta",
    condition: "NEW",
    weightGrams: 3200,
    sellerId: "usr_ioana",
    causeId: "cau_sterilizari",
    donationPercent: 80,
    startLei: 450,
    incrementLei: 25,
    timing: "SCHEDULED",
    status: "SCHEDULED",
  },

  /* ----------------------------------------------- seller-side lifecycle */
  {
    key: "draft-telefon",
    title: "Telefon Samsung Galaxy S21, 128 GB",
    description:
      "Ecran fără zgârieturi, baterie la 89%. Mai am de făcut pozele și de ales cauza.",
    category: "electronice",
    condition: "GOOD",
    weightGrams: 400,
    sellerId: "usr_maria",
    causeId: "cau_ana",
    donationPercent: 30,
    startLei: 700,
    timing: "STATIC",
    status: "DRAFT",
  },
  {
    key: "review-consola",
    title: "Consolă Nintendo Switch OLED, cu 2 jocuri",
    description:
      "Consolă cumpărată acum un an, folosită puțin. Include Mario Kart 8 și Zelda.",
    category: "electronice",
    condition: "LIKE_NEW",
    weightGrams: 1100,
    sellerId: "usr_maria",
    causeId: "cau_ana",
    donationPercent: 50,
    startLei: 900,
    incrementLei: 50,
    timing: "STATIC",
    status: "PENDING_REVIEW",
  },
  {
    key: "anulata",
    title: "Set mobilier grădină din răchită",
    description: "Retras. L-am dat unei vecine care avea nevoie.",
    category: "casa",
    condition: "USED",
    weightGrams: 12_000,
    sellerId: "usr_vlad",
    causeId: "cau_bunici",
    donationPercent: 40,
    startLei: 300,
    timing: "STATIC",
    status: "CANCELLED",
  },
  {
    key: "nevanduta",
    title: "Imprimantă laser HP LaserJet P1102",
    description:
      "Funcționează, dar are nevoie de toner nou. Nu a atins prețul de rezervă.",
    category: "electronice",
    condition: "USED",
    weightGrams: 5600,
    sellerId: "usr_mihai",
    causeId: "cau_ferentari",
    donationPercent: 20,
    startLei: 120,
    incrementLei: 10,
    reserveLei: 250,
    timing: "FINISHED",
    status: "UNSOLD",
    bids: 3,
  },
  {
    key: "nevanduta-2",
    title: "Patine cu rotile mărimea 39",
    description: "Nimeni nu a licitat de data asta. Le relistez săptămâna viitoare.",
    category: "sport",
    condition: "GOOD",
    weightGrams: 2800,
    sellerId: "usr_radu",
    causeId: "cau_padure",
    donationPercent: 50,
    startLei: 140,
    timing: "FINISHED",
    status: "UNSOLD",
    bids: 0,
  },

  /* ------------------------------------------- sold: one per order status */
  {
    key: "sold-confirmare",
    title: "Boxă portabilă JBL Flip 5, waterproof",
    description: "Sunet excelent, baterie ca nouă. Include cablu de încărcare.",
    category: "electronice",
    condition: "VERY_GOOD",
    weightGrams: 700,
    sellerId: "usr_vlad",
    causeId: "cau_ana",
    donationPercent: 40,
    startLei: 180,
    incrementLei: 10,
    timing: "FINISHED",
    status: "SOLD",
    bids: 9,
    winnerId: "usr_maria",
    orderKey: "AWAITING_CONFIRMATION",
  },
  {
    key: "sold-plata",
    title: "Trotinetă electrică Xiaomi Essential",
    description: "Autonomie reală ~18 km. Anvelope schimbate în primăvară.",
    category: "sport",
    condition: "GOOD",
    weightGrams: 12_000,
    sellerId: "usr_radu",
    causeId: "cau_padure",
    donationPercent: 25,
    startLei: 600,
    incrementLei: 50,
    timing: "FINISHED",
    status: "SOLD",
    bids: 12,
    winnerId: "usr_maria",
    orderKey: "AWAITING_PAYMENT",
  },
  {
    key: "sold-esuata",
    title: "Set 6 pahare de cristal Bohemia",
    description: "Moștenite, nefolosite. Cutie originală.",
    category: "casa",
    condition: "NEW",
    weightGrams: 2200,
    sellerId: "usr_elena",
    causeId: "cau_bunici",
    donationPercent: 50,
    startLei: 120,
    incrementLei: 10,
    timing: "FINISHED",
    status: "SOLD",
    bids: 6,
    winnerId: "usr_maria",
    orderKey: "PAYMENT_FAILED",
  },
  {
    key: "sold-escrow",
    title: "Rucsac Osprey Farpoint 40, cabin size",
    description: "Două călătorii, fără uzură. Toate curelele și husa de ploaie.",
    category: "sport",
    condition: "LIKE_NEW",
    weightGrams: 1600,
    sellerId: "usr_vlad",
    causeId: "cau_padure",
    donationPercent: 35,
    startLei: 300,
    incrementLei: 20,
    timing: "FINISHED",
    status: "SOLD",
    bids: 10,
    winnerId: "usr_maria",
    orderKey: "PAID_HELD",
  },
  {
    key: "sold-eticheta",
    title: "Ceainic din fontă japoneză, 1,2 l",
    description: "Interior emailat, fără rugină. Vine cu infuzor.",
    category: "casa",
    condition: "VERY_GOOD",
    weightGrams: 1900,
    sellerId: "usr_maria",
    causeId: "cau_bunici",
    donationPercent: 60,
    startLei: 140,
    incrementLei: 10,
    timing: "FINISHED",
    status: "SOLD",
    bids: 8,
    winnerId: "usr_ioana",
    orderKey: "LABEL_GENERATED",
  },
  {
    key: "sold-predat",
    title: "Aparat de făcut pâine Panasonic SD-2511",
    description: "Folosit un an. Toate programele funcționează, paleta e nouă.",
    category: "casa",
    condition: "GOOD",
    weightGrams: 7200,
    sellerId: "usr_alexandra",
    causeId: "cau_ghiozdane",
    donationPercent: 45,
    startLei: 200,
    incrementLei: 20,
    timing: "FINISHED",
    status: "SOLD",
    bids: 7,
    winnerId: "usr_maria",
    orderKey: "DROPPED_OFF",
  },
  {
    key: "sold-tranzit",
    title: "Cameră GoPro HERO9 Black cu 2 acumulatori",
    description: "Ecran fără zgârieturi, carcasă subacvatică inclusă.",
    category: "electronice",
    condition: "VERY_GOOD",
    weightGrams: 900,
    sellerId: "usr_bogdan",
    causeId: "cau_ambulanta",
    donationPercent: 30,
    startLei: 550,
    incrementLei: 25,
    timing: "FINISHED",
    status: "SOLD",
    bids: 15,
    winnerId: "usr_maria",
    orderKey: "IN_TRANSIT",
  },
  {
    key: "sold-locker",
    title: "Joc de societate Catan + extensia Navigatorii",
    description: "Complet, cu toate piesele numărate. Cutii puțin uzate la colțuri.",
    category: "jucarii",
    condition: "GOOD",
    weightGrams: 2100,
    sellerId: "usr_elena",
    causeId: "cau_biblioteca",
    donationPercent: 70,
    startLei: 130,
    incrementLei: 10,
    timing: "FINISHED",
    status: "SOLD",
    bids: 11,
    winnerId: "usr_maria",
    orderKey: "ARRIVED_AT_LOCKER",
  },
  {
    key: "sold-livrat",
    title: "Pătură din lână merinos, țesută manual",
    description: "Lucrată la război, în Mărginimea Sibiului. 180×140 cm.",
    category: "casa",
    condition: "NEW",
    weightGrams: 2400,
    sellerId: "usr_elena",
    causeId: "cau_bunici",
    donationPercent: 55,
    startLei: 260,
    incrementLei: 20,
    timing: "FINISHED",
    status: "SOLD",
    bids: 9,
    winnerId: "usr_maria",
    orderKey: "DELIVERED",
  },
  {
    key: "sold-finalizat",
    title: "Obiectiv Nikon AF-S 35mm f/1.8G",
    description: "Fără zgârieturi pe lentile, cu ambele capace și parasolar.",
    category: "electronice",
    condition: "VERY_GOOD",
    weightGrams: 500,
    sellerId: "usr_vlad",
    causeId: "cau_ana",
    donationPercent: 50,
    startLei: 400,
    incrementLei: 25,
    timing: "FINISHED",
    status: "SOLD",
    bids: 13,
    winnerId: "usr_maria",
    orderKey: "COMPLETED",
  },
  {
    key: "sold-disputa",
    title: "Telefon iPhone 12, 64 GB, deblocat",
    description: "Baterie la 84%. Ecran original, fără zgârieturi vizibile.",
    category: "electronice",
    condition: "GOOD",
    weightGrams: 450,
    sellerId: "usr_mihai",
    causeId: "cau_ferentari",
    donationPercent: 20,
    startLei: 900,
    incrementLei: 50,
    timing: "FINISHED",
    status: "SOLD",
    bids: 18,
    winnerId: "usr_maria",
    orderKey: "DISPUTE_OPEN",
  },
  {
    key: "sold-disputa-rezolvata",
    title: "Bormașină Bosch PSB 1800 LI-2 cu accesorii",
    description: "Doi acumulatori, valiză completă. Funcționează impecabil.",
    category: "casa",
    condition: "GOOD",
    weightGrams: 3800,
    sellerId: "usr_bogdan",
    causeId: "cau_ferentari",
    donationPercent: 30,
    startLei: 240,
    incrementLei: 20,
    timing: "FINISHED",
    status: "SOLD",
    bids: 6,
    winnerId: "usr_ioana",
    orderKey: "DISPUTE_RESOLVED",
  },
  {
    key: "sold-rambursat",
    title: "Espressor Nespresso Vertuo Next",
    description: "A ajuns cu carcasa crăpată, comanda a fost rambursată integral.",
    category: "casa",
    condition: "LIKE_NEW",
    weightGrams: 4100,
    sellerId: "usr_mihai",
    causeId: "cau_bunici",
    donationPercent: 25,
    startLei: 300,
    incrementLei: 20,
    timing: "FINISHED",
    status: "SOLD",
    bids: 5,
    winnerId: "usr_maria",
    orderKey: "REFUNDED",
  },
  {
    key: "sold-anulat",
    title: "Set valize Samsonite, 2 bucăți",
    description: "Comandă anulată, cardul a fost refuzat de trei ori.",
    category: "casa",
    condition: "VERY_GOOD",
    weightGrams: 6400,
    sellerId: "usr_alexandra",
    causeId: "cau_ghiozdane",
    donationPercent: 40,
    startLei: 350,
    incrementLei: 25,
    timing: "FINISHED",
    status: "SOLD",
    bids: 4,
    winnerId: "usr_radu",
    orderKey: "CANCELLED",
  },
];

/** Bidders drawn on in rotation when synthesising a bid history. */
const BIDDER_POOL = [
  "usr_maria",
  "usr_ioana",
  "usr_radu",
  "usr_alexandra",
  "usr_bogdan",
  "usr_elena",
  "usr_vlad",
  "usr_paspas",
];

function timingWindow(timing: Timing): { start: string; end: string } {
  switch (timing) {
    case "ENDING_SECONDS":
      // Always inside AUCTION.DEFAULT_ANTI_SNIPE_SECONDS, so the extension
      // behaviour is visible on a freshly seeded world.
      return { start: isoAgo(6, "days"), end: isoIn(1.5, "minutes") };
    case "ENDING_MINUTES":
      return { start: isoAgo(5, "days"), end: isoIn(9, "minutes") };
    case "ENDING_HOURS":
      return { start: isoAgo(6, "days"), end: isoIn(11, "hours") };
    case "ENDING_DAYS":
      return { start: isoAgo(2, "days"), end: isoIn(4, "days") };
    case "SCHEDULED":
      return { start: isoIn(2, "days"), end: isoIn(9, "days") };
    case "FINISHED":
      return { start: isoAgo(12, "days"), end: isoAgo(4, "days") };
    case "STATIC":
      return { start: isoIn(3, "days"), end: isoIn(10, "days") };
  }
}

export interface CatalogSeed {
  products: Product[];
  auctions: Auction[];
  bids: Bid[];
  /** orderKey -> auctionId, so the order seed can find its auction. */
  orderTargets: Map<string, string>;
}

export function buildCatalog(): CatalogSeed {
  const products: Product[] = [];
  const auctions: Auction[] = [];
  const bids: Bid[] = [];
  const orderTargets = new Map<string, string>();

  LISTINGS.forEach((seed, listingIndex) => {
    const productId = `prd_${seed.key}`;
    const auctionId = `auc_${seed.key}`;
    const { start, end } = timingWindow(seed.timing);
    const increment = lei(seed.incrementLei ?? 10);
    const startingPrice = lei(seed.startLei);

    products.push({
      id: productId,
      title: seed.title,
      description: seed.description,
      images: productGallery(seed.key, seed.category, 3),
      category: seed.category,
      condition: seed.condition,
      weightGrams: seed.weightGrams,
      sellerId: seed.sellerId,
      causeId: seed.causeId,
      createdAt: start,
    });

    /* --- bid history -------------------------------------------------- */
    const bidCount = seed.bids ?? 0;
    let currentPrice = startingPrice;
    const auctionBids: Bid[] = [];

    for (let index = 0; index < bidCount; index += 1) {
      // Bidders sometimes jump more than the minimum, like real people do.
      const jump = index % 4 === 3 ? 2 : 1;
      const amount = startingPrice + increment * (index + jump);
      const bidderId =
        index === bidCount - 1 && seed.winnerId
          ? seed.winnerId
          : BIDDER_POOL[(listingIndex + index) % BIDDER_POOL.length]!;

      // Spread the history across the auction window, densest near the end.
      const minutesBeforeEnd = Math.round(
        (bidCount - index) *
          (seed.timing === "ENDING_SECONDS"
            ? 18
            : seed.timing === "ENDING_MINUTES"
              ? 24
              : 190),
      );

      auctionBids.push({
        id: `bid_${seed.key}_${index + 1}`,
        auctionId,
        bidderId,
        amount,
        createdAt: new Date(
          Date.parse(end) - minutesBeforeEnd * 60_000,
        ).toISOString(),
        status: "OUTBID",
        triggeredExtension: false,
      });
      currentPrice = amount;
    }

    if (auctionBids.length > 0) {
      const last = auctionBids[auctionBids.length - 1]!;
      last.status =
        seed.status === "SOLD" ? "WON" : seed.status === "LIVE" ? "WINNING" : "LOST";
      if (seed.status === "UNSOLD") {
        auctionBids.forEach((bid) => {
          bid.status = "LOST";
        });
      }
    }
    bids.push(...auctionBids);

    /* --- auction ------------------------------------------------------- */
    const reservePrice = seed.reserveLei ? lei(seed.reserveLei) : undefined;

    auctions.push({
      id: auctionId,
      productId,
      sellerId: seed.sellerId,
      causeId: seed.causeId,
      donationPercent: seed.donationPercent,
      startingPrice,
      currentPrice,
      bidIncrement: increment,
      reservePrice,
      startTime: start,
      endTime: end,
      antiSnipeSeconds: AUCTION.DEFAULT_ANTI_SNIPE_SECONDS,
      status: seed.status,
      winnerId: seed.status === "SOLD" ? seed.winnerId : undefined,
      bidCount,
      watcherCount: 3 + ((listingIndex * 7) % 41),
      extensionCount: 0,
    });

    if (seed.orderKey) orderTargets.set(seed.orderKey, auctionId);
  });

  return { products, auctions, bids, orderTargets };
}
