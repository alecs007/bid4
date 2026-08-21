import { lei } from "@/lib/money";
import type {
  DeliveryMethod,
  PaymentMethodCard,
  User,
} from "@/lib/types";
import { isoAgo } from "@/lib/utils/date";
import { avatarImage } from "../images";

/**
 * Seed accounts. Every one of them logs in with the same demo password so the
 * role switcher can jump between them without a credentials cheat sheet.
 *
 * The four the brief asks for are the first four below; the rest populate bid
 * histories, listings and orders so the app never looks like a single-user demo.
 */
export const DEMO_PASSWORD = "bid4demo";

interface UserSeed {
  id: string;
  email: string;
  displayName: string;
  username: string;
  role: User["role"];
  accountType: User["accountType"];
  bio: string;
  city: string;
  createdDaysAgo: number;
  rating: number;
  ratingCount: number;
  totalRaisedLei: number;
  orgLegalName?: string;
  orgRegistrationNumber?: string;
  stripeReady?: boolean;
  hasPaymentMethod?: boolean;
  /** Highlighted in the dev role switcher and on the login screen. */
  featured?: boolean;
}

const SEEDS: UserSeed[] = [
  {
    id: "usr_maria",
    email: "maria@bid4.ro",
    displayName: "Maria Ionescu",
    username: "maria-ionescu",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Colecționez aparate foto vechi și cred că lucrurile bune merită o a doua viață. Licitez mai ales pentru cauze medicale.",
    city: "București",
    createdDaysAgo: 420,
    rating: 4.9,
    ratingCount: 37,
    totalRaisedLei: 4820,
    stripeReady: true,
    hasPaymentMethod: true,
    featured: true,
  },
  {
    id: "usr_zambet",
    email: "contact@zambet.ro",
    displayName: "Asociația Zâmbet pentru Mâine",
    username: "zambet-pentru-maine",
    role: "USER",
    accountType: "ORGANIZATION",
    orgLegalName: "Asociația Zâmbet pentru Mâine",
    orgRegistrationNumber: "RO38472910",
    bio: "Din 2016 sprijinim copiii din centrele de plasament din Ilfov. Vindem donații primite și strângem fonduri pentru programele noastre.",
    city: "Otopeni",
    createdDaysAgo: 610,
    rating: 5,
    ratingCount: 54,
    totalRaisedLei: 31_400,
    stripeReady: true,
    hasPaymentMethod: true,
    featured: true,
  },
  {
    id: "usr_operator",
    email: "operator@bid4.ro",
    displayName: "Andrei Marinescu",
    username: "andrei-operator",
    role: "OPERATOR",
    accountType: "INDIVIDUAL",
    bio: "Verific cauzele și rezolv disputele. Echipa bid4.",
    city: "Cluj-Napoca",
    createdDaysAgo: 500,
    rating: 5,
    ratingCount: 4,
    totalRaisedLei: 0,
    featured: true,
  },
  {
    id: "usr_admin",
    email: "admin@bid4.ro",
    displayName: "Cristina Dobre",
    username: "cristina-admin",
    role: "ADMIN",
    accountType: "INDIVIDUAL",
    bio: "Administrator bid4.",
    city: "București",
    createdDaysAgo: 640,
    rating: 5,
    ratingCount: 2,
    totalRaisedLei: 0,
    featured: true,
  },

  /* --- supporting cast -------------------------------------------------- */
  {
    id: "usr_vlad",
    email: "vlad.georgescu@example.ro",
    displayName: "Vlad Georgescu",
    username: "vlad-georgescu",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Vând ce nu mai folosesc și donez jumătate. Livrez rapid, ambalez cu grijă.",
    city: "Timișoara",
    createdDaysAgo: 300,
    rating: 4.8,
    ratingCount: 62,
    totalRaisedLei: 7310,
    stripeReady: true,
    hasPaymentMethod: true,
  },
  {
    id: "usr_ioana",
    email: "ioana.petrescu@example.ro",
    displayName: "Ioana Petrescu",
    username: "ioana-petrescu",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Ilustratoare. Licitez pentru adăposturile de animale.",
    city: "Iași",
    createdDaysAgo: 210,
    rating: 4.7,
    ratingCount: 19,
    totalRaisedLei: 1960,
    stripeReady: true,
    hasPaymentMethod: true,
  },
  {
    id: "usr_radu",
    email: "radu.constantin@example.ro",
    displayName: "Radu Constantin",
    username: "radu-constantin",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Pasionat de biciclete și drumeții.",
    city: "Brașov",
    createdDaysAgo: 155,
    rating: 4.6,
    ratingCount: 11,
    totalRaisedLei: 890,
    stripeReady: false,
    hasPaymentMethod: true,
  },
  {
    id: "usr_elena",
    email: "elena.marin@example.ro",
    displayName: "Elena Marin",
    username: "elena-marin",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Profesoară de română. Strâng cărți pentru bibliotecile sătești.",
    city: "Sibiu",
    createdDaysAgo: 275,
    rating: 4.9,
    ratingCount: 28,
    totalRaisedLei: 3140,
    stripeReady: true,
    hasPaymentMethod: true,
  },
  {
    id: "usr_paspas",
    email: "contact@pascupas.ro",
    displayName: "Fundația Pas cu Pas",
    username: "fundatia-pas-cu-pas",
    role: "USER",
    accountType: "ORGANIZATION",
    orgLegalName: "Fundația Pas cu Pas",
    orgRegistrationNumber: "RO29183746",
    bio: "Terapie și recuperare pentru copii cu nevoi speciale, în Cluj.",
    city: "Cluj-Napoca",
    createdDaysAgo: 480,
    rating: 4.9,
    ratingCount: 41,
    totalRaisedLei: 22_780,
    stripeReady: true,
    hasPaymentMethod: true,
  },
  {
    id: "usr_bogdan",
    email: "bogdan.stan@example.ro",
    displayName: "Bogdan Stan",
    username: "bogdan-stan",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Colecționar de vinil.",
    city: "Constanța",
    createdDaysAgo: 95,
    rating: 4.5,
    ratingCount: 8,
    totalRaisedLei: 420,
    stripeReady: false,
    hasPaymentMethod: true,
  },
  {
    id: "usr_alexandra",
    email: "alexandra.tudor@example.ro",
    displayName: "Alexandra Tudor",
    username: "alexandra-tudor",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Mamă a doi copii, fac curat în dulap de două ori pe an.",
    city: "Oradea",
    createdDaysAgo: 130,
    rating: 4.8,
    ratingCount: 23,
    totalRaisedLei: 1580,
    stripeReady: true,
    hasPaymentMethod: true,
  },
  {
    id: "usr_mihai",
    email: "mihai.rusu@example.ro",
    displayName: "Mihai Rusu",
    username: "mihai-rusu",
    role: "USER",
    accountType: "INDIVIDUAL",
    bio: "Inginer, pasionat de electronice retro.",
    city: "Craiova",
    createdDaysAgo: 60,
    rating: 4.4,
    ratingCount: 6,
    totalRaisedLei: 260,
    /** Deliberately not bid-ready: exercises the "add a card" gate. */
    stripeReady: false,
    hasPaymentMethod: false,
  },
];

export const FEATURED_ACCOUNT_IDS = SEEDS.filter((seed) => seed.featured).map(
  (seed) => seed.id,
);

export function buildUsers(): User[] {
  return SEEDS.map((seed) => ({
    id: seed.id,
    email: seed.email,
    displayName: seed.displayName,
    username: seed.username,
    role: seed.role,
    accountType: seed.accountType,
    status: "ACTIVE",
    orgLegalName: seed.orgLegalName,
    orgRegistrationNumber: seed.orgRegistrationNumber,
    avatarUrl: avatarImage(seed.id, seed.displayName),
    bio: seed.bio,
    city: seed.city,
    createdAt: isoAgo(seed.createdDaysAgo, "days"),
    stripeReady: seed.stripeReady ?? false,
    hasPaymentMethod: seed.hasPaymentMethod ?? false,
    defaultDeliveryMethodId:
      seed.id === "usr_mihai" ? undefined : `dlv_${seed.id}`,
    rating: seed.rating,
    ratingCount: seed.ratingCount,
    totalRaised: lei(seed.totalRaisedLei),
  }));
}

/* -------------------------------------------------------------------------- */

const LOCKERS: [string, string, string][] = [
  ["BUC-142", "Easybox Auchan Titan", "Bd. 1 Decembrie 1918 nr. 33, București"],
  ["CLJ-058", "Easybox Kaufland Mărăști", "Str. Fabricii de Zahăr 5, Cluj-Napoca"],
  ["TIM-021", "Easybox Iulius Town", "Str. Aristide Demetriade 1, Timișoara"],
  ["IAS-034", "Easybox Palas Mall", "Str. Palas 7A, Iași"],
  ["BRA-017", "Easybox Coresi", "Str. Zaharia Stancu 1, Brașov"],
  ["SIB-009", "Easybox Promenada", "Str. Nicolae Teclu 50, Sibiu"],
  ["CON-026", "Easybox City Park", "Bd. Alexandru Lăpușneanu 116C, Constanța"],
  ["ORA-011", "Easybox Lotus Center", "Str. Nufărului 30, Oradea"],
  ["CRV-014", "Easybox Electroputere", "Calea București 82, Craiova"],
  ["OTP-003", "Easybox Otopeni Centru", "Calea Bucureștilor 224, Otopeni"],
];

const PHONES = [
  "0745 220 907",
  "0721 004 118",
  "0733 819 402",
  "0764 551 230",
  "0788 340 617",
  "0712 907 445",
  "0755 118 903",
  "0799 462 108",
  "0730 285 671",
  "0766 913 084",
  "0741 620 359",
  "0777 204 815",
];

/** One default delivery method per user — the gate that unlocks bidding. */
export function buildDeliveryMethods(users: User[]): DeliveryMethod[] {
  return users
    .filter((user) => user.id !== "usr_mihai")
    .map((user, index) => {
      const locker = LOCKERS[index % LOCKERS.length]!;
      const phone = PHONES[index % PHONES.length]!;
      return {
        id: `dlv_${user.id}`,
        userId: user.id,
        type: "EASYBOX" as const,
        label: `Easybox lângă ${user.city ?? "casă"}`,
        easyboxLockerId: locker[0],
        lockerName: locker[1],
        lockerAddress: locker[2],
        phone,
        isDefault: true,
      };
    });
}

/** A couple of users also keep a home-courier option, to exercise both flows. */
export function buildExtraDeliveryMethods(): DeliveryMethod[] {
  return [
    {
      id: "dlv_maria_home",
      userId: "usr_maria",
      type: "HOME_COURIER",
      label: "Acasă",
      homeAddress: {
        recipientName: "Maria Ionescu",
        street: "Str. Popa Nan 23, ap. 4",
        city: "București",
        county: "Sector 2",
        postalCode: "023951",
        details: "Interfon 4, etaj 2",
      },
      phone: "0745 220 907",
      isDefault: false,
    },
    {
      id: "dlv_vlad_home",
      userId: "usr_vlad",
      type: "HOME_COURIER",
      label: "Birou",
      homeAddress: {
        recipientName: "Vlad Georgescu",
        street: "Str. Gheorghe Lazăr 14",
        city: "Timișoara",
        county: "Timiș",
        postalCode: "300081",
      },
      phone: "0721 004 118",
      isDefault: false,
    },
  ];
}

const CARD_BRANDS: PaymentMethodCard["brand"][] = [
  "visa",
  "mastercard",
  "visa",
  "mastercard",
];

export function buildCards(users: User[]): PaymentMethodCard[] {
  return users
    .filter((user) => user.hasPaymentMethod)
    .map((user, index) => ({
      id: `pm_${user.id}`,
      userId: user.id,
      brand: CARD_BRANDS[index % CARD_BRANDS.length]!,
      last4: String(4100 + index * 37).slice(-4),
      expMonth: ((index * 5) % 12) + 1,
      expYear: 2029 + (index % 3),
      holderName: user.displayName,
      isDefault: true,
    }));
}
