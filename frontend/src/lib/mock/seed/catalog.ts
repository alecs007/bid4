import { AUCTION, LEU, type AuctionCategoryId } from "@/lib/config";
import { lei } from "@/lib/money";
import type { Auction, AuctionStatus, Bid, ItemCondition } from "@/lib/types";
import { isoAgo } from "@/lib/utils/date";
import { auctionGallery } from "../images";

type Age =
  | "TODAY"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "OLD"
  | "STATIC"; // draft / review: the date says nothing

interface ListingSeed {
  key: string;
  title: string;
  description: string;
  category: AuctionCategoryId;
  condition: ItemCondition;
  weightGrams: number;
  sellerId: string;
  causeId: string;
  donationPercent: number;
  startLei: number;
  reserveLei?: number;
  buyNowLei?: number;
  age: Age;
  status: AuctionStatus;
  bids?: number;
  winnerId?: string;
  orderKey?: string;
}

const LISTINGS: ListingSeed[] = [
  {
    key: "tricou-retro",
    title: "Tricou retro Steaua București, ediție aniversară",
    description:
      "Replică oficială a echipamentului din 1986, mărimea L. Nepurtat, cu etichetă. Anunțul rămâne deschis până aleg o ofertă.",
    category: "moda",
    condition: "NEW",
    weightGrams: 320,
    sellerId: "usr_alexandra",
    causeId: "cau_ferentari",
    donationPercent: 65,
    startLei: 90,
    age: "TODAY",
    status: "LIVE",
    bids: 13,
  },

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
    reserveLei: 400,
    age: "TODAY",
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
    age: "TODAY",
    status: "LIVE",
    bids: 9,
  },

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
    reserveLei: 650,
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
    status: "LIVE",
    bids: 16,
  },

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
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
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
    reserveLei: 400,
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
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
    age: "THIS_WEEK",
    status: "LIVE",
    bids: 10,
  },

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
    age: "LAST_WEEK",
    status: "RESERVED",
    bids: 4,
    winnerId: "usr_bogdan",
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
    buyNowLei: 900,
    age: "LAST_WEEK",
    status: "RESERVED",
    bids: 2,
    winnerId: "usr_vlad",
  },

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
    age: "STATIC",
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
    age: "STATIC",
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
    age: "STATIC",
    status: "CANCELLED",
  },
  {
    key: "nevanduta",
    title: "Imprimantă laser HP LaserJet P1102",
    description:
      "Funcționează, dar are nevoie de toner nou. Am retras anunțul până îl schimb.",
    category: "electronice",
    condition: "USED",
    weightGrams: 5600,
    sellerId: "usr_mihai",
    causeId: "cau_ferentari",
    donationPercent: 20,
    startLei: 120,
    reserveLei: 250,
    age: "OLD",
    status: "CANCELLED",
    bids: 3,
  },
  {
    key: "nevanduta-2",
    title: "Patine cu rotile mărimea 39",
    description: "Nu a fost nicio ofertă. Le relistez săptămâna viitoare.",
    category: "sport",
    condition: "GOOD",
    weightGrams: 2800,
    sellerId: "usr_radu",
    causeId: "cau_padure",
    donationPercent: 50,
    startLei: 140,
    age: "OLD",
    status: "CANCELLED",
    bids: 0,
  },

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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
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
    age: "OLD",
    status: "SOLD",
    bids: 4,
    winnerId: "usr_radu",
    orderKey: "CANCELLED",
  },
];

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

function startedAt(age: Age): string {
  switch (age) {
    case "TODAY":
      return isoAgo(5, "hours");
    case "THIS_WEEK":
      return isoAgo(2, "days");
    case "LAST_WEEK":
      return isoAgo(6, "days");
    case "OLD":
      return isoAgo(12, "days");
    case "STATIC":
      return isoAgo(1, "days");
  }
}

export interface CatalogSeed {
  auctions: Auction[];
  bids: Bid[];
  orderTargets: Map<string, string>;
}

export function buildCatalog(): CatalogSeed {
  const auctions: Auction[] = [];
  const bids: Bid[] = [];
  const orderTargets = new Map<string, string>();

  LISTINGS.forEach((seed, listingIndex) => {
    const auctionId = `auc_${seed.key}`;
    const start = startedAt(seed.age);
    const startingPrice = lei(seed.startLei);
    const raise = Math.max(LEU, Math.round(startingPrice / 20 / LEU) * LEU);

    const bidCount = seed.bids ?? 0;
    let currentPrice = startingPrice;
    const auctionBids: Bid[] = [];

    let step = 0;
    for (let index = 0; index < bidCount; index += 1) {
      step += index % 4 === 3 ? 2 : 1;
      const amount = startingPrice + raise * step;
      const bidderId =
        index === bidCount - 1 && seed.winnerId
          ? seed.winnerId
          : BIDDER_POOL[(listingIndex + index) % BIDDER_POOL.length]!;

      const minutesAgo = Math.round((bidCount - index) * 190);

      auctionBids.push({
        id: `bid_${seed.key}_${index + 1}`,
        auctionId,
        bidderId,
        amount,
        createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
        status: "OUTBID",
      });
      currentPrice = amount;
    }

    const latest = new Map<string, Bid>();
    auctionBids.forEach((bid) => latest.set(bid.bidderId, bid));
    const keptBids = auctionBids.filter((bid) => latest.get(bid.bidderId) === bid);

    let acceptedBid: Bid | undefined;
    if (keptBids.length > 0) {
      switch (seed.status) {
        case "LIVE":
          keptBids[keptBids.length - 1]!.status = "WINNING";
          break;
        case "RESERVED":
          acceptedBid = keptBids[Math.floor((keptBids.length - 1) / 2)]!;
          acceptedBid.status = "ACCEPTED";
          if (keptBids[keptBids.length - 1] !== acceptedBid) {
            keptBids[keptBids.length - 1]!.status = "WINNING";
          }
          break;
        case "SOLD":
          keptBids.forEach((bid) => {
            bid.status = "LOST";
          });
          acceptedBid = keptBids[keptBids.length - 1]!;
          acceptedBid.status = "WON";
          break;
        default:
          keptBids.forEach((bid) => {
            bid.status = "LOST";
          });
      }
    }
    bids.push(...keptBids);

    const reservePrice = seed.reserveLei ? lei(seed.reserveLei) : undefined;
    const committed = seed.status === "RESERVED" || seed.status === "SOLD";
    const acceptedAt = committed ? isoAgo(seed.status === "SOLD" ? 2 : 1, "days") : undefined;

    auctions.push({
      id: auctionId,
      sellerId: seed.sellerId,
      causeId: seed.causeId,
      title: seed.title,
      description: seed.description,
      images: auctionGallery(seed.key, seed.category, 1 + (listingIndex % 6)),
      category: seed.category,
      condition: seed.condition,
      weightGrams: seed.weightGrams,
      donationPercent: seed.donationPercent,
      startingPrice,
      currentPrice,
      reservePrice,
      buyNowPrice: seed.buyNowLei ? lei(seed.buyNowLei) : undefined,
      startTime: start,
      acceptedAt,
      dispatchDeadline:
        seed.status === "SOLD" && acceptedAt
          ? new Date(
              Date.parse(acceptedAt) + AUCTION.DISPATCH_DAYS * 86_400_000,
            ).toISOString()
          : undefined,
      status: seed.status,
      winnerId: committed ? (acceptedBid?.bidderId ?? seed.winnerId) : undefined,
      bidCount: keptBids.length,
      watcherCount: 3 + ((listingIndex * 7) % 41),
      createdAt: start,
    });

    if (seed.orderKey) orderTargets.set(seed.orderKey, auctionId);
  });

  return { auctions, bids, orderTargets };
}
