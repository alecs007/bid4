import type { CauseCategoryId } from "@/lib/config";
import { lei } from "@/lib/money";
import { CAUSE } from "@/lib/config";
import type {
  BeneficiaryType,
  Cause,
  CauseStatus,
  VerificationStatus,
} from "@/lib/types";
import { isoAgo } from "@/lib/utils/date";
import { causeCover, causeGallery, causeImage } from "../images";

interface CauseSeed {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  story: string;
  category: CauseCategoryId;
  organizerId: string;
  status: CauseStatus;
  goalLei: number;
  raisedLei: number;
  supporterCount: number;
  createdDaysAgo: number;
  legalName: string;
  cui: string;
  representative: string;
  email: string;
  phone: string;
  website?: string;
  iban: string;
  rejectionReason?: string;
  beneficiaryType?: BeneficiaryType;
  county?: string;
  city?: string;
}

const VERIFICATION_OF: Record<CauseStatus, VerificationStatus> = {
  DRAFT: "UNVERIFIED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  ACTIVE: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "APPROVED",
};

const SEEDS: CauseSeed[] = [
  {
    id: "cau_ana",
    name: "Împreună pentru Ana",
    slug: "impreuna-pentru-ana",
    shortDescription:
      "Ana are 7 ani și luptă cu leucemie. Strângem bani pentru tratamentul din Viena.",
    story:
      "Ana are 7 ani, adoră dinozaurii și vrea să se facă paleontolog. În februarie a fost diagnosticată cu leucemie limfoblastică acută. Protocolul de tratament recomandat de medicii din Viena costă 240.000 de euro, iar familia a reușit să strângă până acum o treime.\n\nFiecare licitație de pe această pagină duce Ana mai aproape de prima ședință. Banii ajung direct în contul deschis pe numele mamei, iar toate cheltuielile sunt publicate lunar pe pagina asociației.\n\nMulțumim fiecărei persoane care licitează. Chiar și o ofertă mică înseamnă un pas.",
    category: "medical",
    organizerId: "usr_zambet",
    status: "ACTIVE",
    goalLei: 250_000,
    raisedLei: 86_420,
    supporterCount: 214,
    createdDaysAgo: 96,
    legalName: "Asociația Zâmbet pentru Mâine",
    cui: "RO38472910",
    representative: "Ioana Dumitrescu",
    email: "contact@zambet.ro",
    phone: "0721 118 004",
    website: "https://zambet.ro",
    iban: "RO49AAAA1B31007593840000",
  },
  {
    id: "cau_ghiozdane",
    name: "Ghiozdane pline de speranță",
    slug: "ghiozdane-pline-de-speranta",
    shortDescription:
      "Rechizite complete pentru 300 de copii din mediul rural, înainte de prima zi de școală.",
    story:
      "În fiecare septembrie, mii de copii din satele României încep școala fără caiete, fără ghiozdan și, uneori, fără încălțăminte potrivită. De patru ani ducem pachete complete în școlile din Vaslui, Botoșani și Teleorman.\n\nUn ghiozdan complet costă 180 de lei: rechizite pentru tot anul, un penar, caiete, culori și o carte de povești aleasă pe vârstă.\n\nAnul acesta ne-am propus 300 de copii. Suntem la jumătate.",
    category: "educatie",
    organizerId: "usr_elena",
    status: "ACTIVE",
    goalLei: 54_000,
    raisedLei: 29_860,
    supporterCount: 148,
    createdDaysAgo: 74,
    legalName: "Asociația Educație pentru Toți",
    cui: "RO41029385",
    representative: "Elena Marin",
    email: "elena.marin@example.ro",
    phone: "0733 819 402",
    iban: "RO12BBBB1B31007593841111",
  },
  {
    id: "cau_labute",
    name: "Adăpostul Lăbuțe Fericite",
    slug: "adapostul-labute-fericite",
    shortDescription:
      "Hrană, tratamente și căldură pentru 120 de câini salvați de pe străzile Iașiului.",
    story:
      "Adăpostul nostru are 120 de câini, dintre care 30 sunt seniori sau au nevoi speciale. Costurile lunare de hrană și medicamente ajung la 14.000 de lei.\n\nIarna trecută am izolat două dintre padocuri, dar mai avem trei de acoperit până în noiembrie.\n\nOrice licitație de aici înseamnă o zi în plus de mâncare caldă și un culcuș uscat.",
    category: "animale",
    organizerId: "usr_ioana",
    status: "ACTIVE",
    goalLei: 60_000,
    raisedLei: 41_300,
    supporterCount: 302,
    createdDaysAgo: 158,
    legalName: "Asociația Lăbuțe Fericite",
    cui: "RO37281940",
    representative: "Ioana Petrescu",
    email: "ioana.petrescu@example.ro",
    phone: "0764 551 230",
    website: "https://labutefericite.ro",
    iban: "RO88CCCC1B31007593842222",
  },
  {
    id: "cau_bunici",
    name: "O masă caldă pentru bunici",
    slug: "o-masa-calda-pentru-bunici",
    shortDescription:
      "Prânz zilnic livrat la domiciliu pentru 80 de vârstnici singuri din Sibiu.",
    story:
      "Doamna Veta are 84 de ani și locuiește singură într-un apartament fără lift, la etajul patru. De doi ani îi ducem prânzul de luni până vineri.\n\nSunt 80 de bunici în programul nostru. O masă costă 22 de lei, transport inclus. Pentru mulți dintre ei, voluntarul care sună la ușă este singura persoană cu care vorbesc în ziua aceea.",
    category: "varstnici",
    organizerId: "usr_elena",
    status: "ACTIVE",
    goalLei: 88_000,
    raisedLei: 52_140,
    supporterCount: 176,
    createdDaysAgo: 122,
    legalName: "Asociația Sprijin pentru Vârstnici Sibiu",
    cui: "RO40182736",
    representative: "Elena Marin",
    email: "elena.marin@example.ro",
    phone: "0788 340 617",
    iban: "RO55DDDD1B31007593843333",
  },
  {
    id: "cau_padure",
    name: "Pădurea de mâine",
    slug: "padurea-de-maine",
    shortDescription:
      "30.000 de puieți plantați pe terenurile degradate din Vrancea.",
    story:
      "Vrancea pierde anual sute de hectare de pădure, iar alunecările de teren ajung tot mai aproape de sate. Împreună cu Ocolul Silvic am identificat 12 hectare care pot fi împădurite în această toamnă.\n\nUn puiet costă 4 lei, cu tot cu plantare și îngrijire în primii doi ani. Plantăm cu voluntari, în weekenduri, iar fiecare donator primește coordonatele parcelei.",
    category: "mediu",
    organizerId: "usr_vlad",
    status: "ACTIVE",
    goalLei: 120_000,
    raisedLei: 38_900,
    supporterCount: 231,
    createdDaysAgo: 65,
    legalName: "Asociația Pădurea de Mâine",
    cui: "RO42910385",
    representative: "Vlad Georgescu",
    email: "vlad.georgescu@example.ro",
    phone: "0712 907 445",
    website: "https://padureademaine.ro",
    iban: "RO77EEEE1B31007593844444",
  },
  {
    id: "cau_autism",
    name: "Terapie pentru copiii cu autism",
    slug: "terapie-pentru-copiii-cu-autism",
    shortDescription:
      "Ședințe ABA pentru 24 de copii din Cluj, gratuite pentru familii.",
    story:
      "Terapia ABA funcționează, dar costă între 3.000 și 5.000 de lei pe lună, imposibil pentru majoritatea familiilor. În centrul nostru din Mărăști lucrăm cu 24 de copii, cu terapeuți acreditați.\n\nUn pachet lunar complet pentru un copil costă 3.400 de lei. Fiecare lună câștigată contează enorm: intervenția timpurie schimbă traiectoria unui copil pe viață.",
    category: "copii",
    organizerId: "usr_paspas",
    status: "ACTIVE",
    goalLei: 160_000,
    raisedLei: 118_450,
    supporterCount: 289,
    createdDaysAgo: 189,
    legalName: "Fundația Pas cu Pas",
    cui: "RO29183746",
    representative: "Andreea Coman",
    email: "contact@pascupas.ro",
    phone: "0755 118 903",
    website: "https://pascupas.ro",
    iban: "RO33FFFF1B31007593845555",
  },
  {
    id: "cau_biblioteca",
    name: "Bibliotecă pentru satul Vlădeni",
    slug: "biblioteca-pentru-satul-vladeni",
    shortDescription:
      "Prima bibliotecă din comună, într-o sală de clasă renovată de părinți.",
    story:
      "În Vlădeni nu există librărie, bibliotecă sau chioșc de ziare. Cel mai apropiat oraș e la 38 de kilometri.\n\nȘcoala ne-a dat o sală goală. Părinții au zugrăvit-o într-un weekend. Ne mai trebuie rafturi, mobilier, un calculator și, evident, cărți. Vrem să pornim cu 2.000 de volume alese pe vârste.",
    category: "educatie",
    organizerId: "usr_elena",
    status: "ACTIVE",
    goalLei: 45_000,
    raisedLei: 44_100,
    supporterCount: 167,
    createdDaysAgo: 88,
    legalName: "Asociația Educație pentru Toți",
    cui: "RO41029385",
    representative: "Elena Marin",
    email: "elena.marin@example.ro",
    phone: "0733 819 402",
    iban: "RO12BBBB1B31007593841111",
  },
  {
    id: "cau_ambulanta",
    name: "Ambulanță pentru Deltă",
    slug: "ambulanta-pentru-delta",
    shortDescription:
      "O șalupă medicalizată pentru satele fără drum din Delta Dunării.",
    story:
      "În Delta Dunării sunt sate în care se ajunge doar pe apă. Când cineva face infarct la Caraorman, ajutorul vine în două ore, dacă vine.\n\nStrângem fonduri pentru o șalupă medicalizată, cu targă, defibrilator și oxigen, care să deservească patru localități. Costul total, cu dotări, este de 380.000 de lei.",
    category: "urgente",
    organizerId: "usr_zambet",
    status: "ACTIVE",
    goalLei: 380_000,
    raisedLei: 97_600,
    supporterCount: 402,
    createdDaysAgo: 143,
    legalName: "Asociația Zâmbet pentru Mâine",
    cui: "RO38472910",
    representative: "Ioana Dumitrescu",
    email: "contact@zambet.ro",
    phone: "0721 118 004",
    website: "https://zambet.ro",
    iban: "RO49AAAA1B31007593840000",
  },
  {
    id: "cau_ferentari",
    name: "Casa comunitară Ferentari",
    slug: "casa-comunitara-ferentari",
    shortDescription:
      "After-school, duș cald și o masă pentru 60 de copii din cartier.",
    story:
      "Casa comunitară e deschisă de luni până sâmbătă. Copiii vin după ore: își fac temele, mănâncă, fac duș, se joacă în siguranță.\n\nAnul acesta vrem să prelungim programul până la ora 20:00 și să angajăm încă un pedagog. Bugetul anual al casei este de 210.000 de lei.",
    category: "comunitate",
    organizerId: "usr_zambet",
    status: "ACTIVE",
    goalLei: 210_000,
    raisedLei: 63_780,
    supporterCount: 195,
    createdDaysAgo: 210,
    legalName: "Asociația Zâmbet pentru Mâine",
    cui: "RO38472910",
    representative: "Ioana Dumitrescu",
    email: "contact@zambet.ro",
    phone: "0721 118 004",
    iban: "RO49AAAA1B31007593840000",
  },
  {
    id: "cau_sterilizari",
    name: "Sterilizări gratuite în Cluj",
    slug: "sterilizari-gratuite-in-cluj",
    shortDescription:
      "1.000 de sterilizări gratuite pentru pisicile și câinii comunitari.",
    story:
      "O pisică nesterilizată poate avea 20 de pui pe an. Sterilizarea e singura soluție umană și, pe termen lung, cea mai ieftină.\n\nLucrăm cu patru cabinete veterinare din Cluj. O sterilizare costă între 120 și 200 de lei, în funcție de animal. Ținta noastră pentru anul acesta este 1.000 de intervenții.",
    category: "animale",
    organizerId: "usr_ioana",
    status: "ACTIVE",
    goalLei: 150_000,
    raisedLei: 21_400,
    supporterCount: 88,
    createdDaysAgo: 41,
    legalName: "Asociația Lăbuțe Fericite",
    cui: "RO37281940",
    representative: "Ioana Petrescu",
    email: "ioana.petrescu@example.ro",
    phone: "0764 551 230",
    iban: "RO88CCCC1B31007593842222",
  },

  {
    id: "cau_rmn",
    name: "Aparat RMN pentru Spitalul Județean",
    slug: "aparat-rmn-spitalul-judetean",
    shortDescription:
      "Un RMN modern pentru un spital care trimite pacienții la 120 km distanță.",
    story:
      "Spitalul Județean deservește 400.000 de oameni și nu are RMN funcțional din 2023. Pacienții sunt trimiși în alt județ, cu programări la două luni distanță.\n\nAm obținut acordul Consiliului Județean pentru cofinanțare: dacă strângem 40% din sumă, restul vine de la buget.",
    category: "medical",
    organizerId: "usr_paspas",
    status: "PENDING_APPROVAL",
    goalLei: 900_000,
    raisedLei: 0,
    supporterCount: 0,
    createdDaysAgo: 3,
    legalName: "Fundația Pas cu Pas",
    cui: "RO29183746",
    representative: "Andreea Coman",
    email: "contact@pascupas.ro",
    phone: "0755 118 903",
    website: "https://pascupas.ro",
    iban: "RO33FFFF1B31007593845555",
  },
  {
    id: "cau_monoparentale",
    name: "Sprijin pentru familii monoparentale",
    slug: "sprijin-familii-monoparentale",
    shortDescription:
      "Ajutor lunar cu chiria și utilitățile pentru 40 de mame singure.",
    story:
      "Lucrăm cu 40 de mame care cresc singure unul sau mai mulți copii. Cele mai multe au un venit sub salariul minim și cheltuie peste 60% din el pe chirie.\n\nProgramul acoperă diferența pentru șase luni, timp în care beneficiarele intră într-un program de recalificare.",
    category: "comunitate",
    organizerId: "usr_alexandra",
    status: "PENDING_APPROVAL",
    goalLei: 96_000,
    raisedLei: 0,
    supporterCount: 0,
    createdDaysAgo: 1,
    legalName: "Asociația Împreună Acasă",
    cui: "RO44281937",
    representative: "Alexandra Tudor",
    email: "alexandra.tudor@example.ro",
    phone: "0799 462 108",
    iban: "RO66GGGG1B31007593846666",
  },

  {
    id: "cau_programare",
    name: "Cursuri de programare pentru liceeni",
    slug: "cursuri-programare-liceeni",
    shortDescription:
      "Cursuri gratuite de programare pentru elevi din licee tehnologice.",
    story:
      "Vrem să pornim patru grupe de câte 15 elevi, cu mentori voluntari din industrie. Cursurile ar avea loc sâmbăta, în laboratorul unui liceu partener.",
    category: "educatie",
    organizerId: "usr_bogdan",
    status: "REJECTED",
    goalLei: 40_000,
    raisedLei: 0,
    supporterCount: 0,
    createdDaysAgo: 18,
    legalName: "Bogdan Stan",
    cui: "",
    representative: "Bogdan Stan",
    email: "bogdan.stan@example.ro",
    phone: "0730 285 671",
    iban: "RO99HHHH1B31007593847777",
    rejectionReason:
      "Lipsesc documentele de înregistrare ale organizației și dovada contului bancar pe numele entității. Reia formularul cu actele complete și îl reevaluăm în 48 de ore.",
  },
  {
    id: "cau_camin",
    name: "Renovare cămin de bătrâni",
    slug: "renovare-camin-de-batrani",
    shortDescription: "Acoperiș nou și centrală termică pentru căminul din Zalău.",
    story:
      "Căminul adăpostește 42 de vârstnici. Acoperișul curge în trei locuri, iar centrala are 19 ani.",
    category: "varstnici",
    organizerId: "usr_maria",
    status: "DRAFT",
    goalLei: 130_000,
    raisedLei: 0,
    supporterCount: 0,
    createdDaysAgo: 2,
    legalName: "",
    cui: "",
    representative: "Maria Ionescu",
    email: "maria@bid4.ro",
    phone: "0745 220 907",
    iban: "",
  },
  {
    id: "cau_suspendata",
    name: "Tabere de vară pentru copii",
    slug: "tabere-de-vara-pentru-copii",
    shortDescription: "Două săptămâni de tabără la munte pentru 50 de copii.",
    story:
      "Program aflat temporar în verificare, la solicitarea echipei bid4. Organizatorul a fost notificat.",
    category: "copii",
    organizerId: "usr_bogdan",
    status: "SUSPENDED",
    goalLei: 70_000,
    raisedLei: 12_300,
    supporterCount: 44,
    createdDaysAgo: 132,
    legalName: "Asociația Vacanța Copiilor",
    cui: "RO39182745",
    representative: "Bogdan Stan",
    email: "bogdan.stan@example.ro",
    phone: "0730 285 671",
    iban: "RO99HHHH1B31007593847777",
  },
];

export const ACTIVE_CAUSE_IDS = SEEDS.filter(
  (seed) => seed.status === "ACTIVE" || seed.status === "APPROVED",
).map((seed) => seed.id);

export function buildCauses(): Cause[] {
  return SEEDS.map((seed) => {
    const submitted =
      seed.status === "DRAFT" ? undefined : isoAgo(seed.createdDaysAgo, "days");
    const approved =
      seed.status === "ACTIVE" || seed.status === "APPROVED"
        ? isoAgo(Math.max(1, seed.createdDaysAgo - 2), "days")
        : undefined;

    return {
      id: seed.id,
      name: seed.name,
      slug: seed.slug,
      shortDescription: seed.shortDescription,
      story: seed.story,
      category: seed.category,
      imageUrl: causeImage(seed.slug, seed.category),
      coverUrl: causeCover(seed.slug, seed.category),
      gallery:
        seed.status === "DRAFT" ? [] : causeGallery(seed.id, seed.category),
      organizerId: seed.organizerId,
      status: seed.status,
      validation: {
        legalName: seed.legalName,
        registrationNumber: seed.cui,
        representativeName: seed.representative,
        contactEmail: seed.email,
        contactPhone: seed.phone,
        website: seed.website,
        payoutAccountRef: seed.iban,
        documents:
          seed.status === "DRAFT"
            ? []
            : [
                {
                  id: `doc_${seed.id}_1`,
                  kind: "REGISTRATION_CERTIFICATE",
                  fileName: "certificat-inregistrare.pdf",
                  fileUrl: `/mock/docs/${seed.id}-certificat.pdf`,
                  sizeBytes: 384_512,
                  uploadedAt: isoAgo(seed.createdDaysAgo, "days"),
                },
                {
                  id: `doc_${seed.id}_2`,
                  kind: "STATUTE",
                  fileName: "statut-asociatie.pdf",
                  fileUrl: `/mock/docs/${seed.id}-statut.pdf`,
                  sizeBytes: 1_204_880,
                  uploadedAt: isoAgo(seed.createdDaysAgo, "days"),
                },
                {
                  id: `doc_${seed.id}_3`,
                  kind: "BANK_PROOF",
                  fileName: "extras-cont.pdf",
                  fileUrl: `/mock/docs/${seed.id}-extras.pdf`,
                  sizeBytes: 201_338,
                  uploadedAt: isoAgo(seed.createdDaysAgo, "days"),
                },
              ],
      },
      beneficiaryType: seed.beneficiaryType ?? "NGO",
      beneficiary: {
        fullName: seed.representative,
        contactEmail: seed.email,
        contactPhone: seed.phone,
        county: seed.county ?? "București",
        city: seed.city ?? "București",
      },
      ngo:
        (seed.beneficiaryType ?? "NGO") === "NGO"
          ? {
              legalName: seed.legalName,
              registrationNumber: seed.cui,
              representativeName: seed.representative,
            }
          : undefined,
      documents: [],
      payout: {
        method:
          (seed.beneficiaryType ?? "NGO") === "NGO"
            ? "STRIPE_NGO"
            : "STRIPE_INDIVIDUAL",
        iban: seed.iban,
        stripeOnboarded: seed.status !== "DRAFT",
      },
      verification: {
        status: VERIFICATION_OF[seed.status],
        cap:
          VERIFICATION_OF[seed.status] === "APPROVED"
            ? undefined
            : CAUSE.UNVERIFIED_CAP,
        rejectionReason: seed.rejectionReason,
      },
      goalAmount: lei(seed.goalLei),
      raisedAmount: lei(seed.raisedLei),
      supporterCount: seed.supporterCount,
      rejectionReason: seed.rejectionReason,
      createdAt: isoAgo(seed.createdDaysAgo, "days"),
      submittedAt: submitted,
      approvedAt: approved,
    };
  });
}
