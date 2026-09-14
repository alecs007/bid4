import type { Metadata } from "next";
import Link from "next/link";

import { Icons } from "@/components/icons";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageTitle } from "@/components/layout/PageTitle";
import { ButtonLink, Card, IconBubble } from "@/components/ui";

export const metadata: Metadata = {
  title: "Centru de ajutor",
  description:
    "Cum licitezi, cum vinzi, cum ajung banii la cauză și ce se întâmplă dacă ceva nu merge. Răspunsurile la întrebările pe care le primim cel mai des.",
  keywords: ["ajutor", "suport", "intrebari frecvente", "livrare", "comisioane"],
  alternates: { canonical: "/ajutor" },
  openGraph: {
    type: "website",
    url: "/ajutor",
    title: "Centru de ajutor | bid4",
    description:
      "Cum licitezi, cum vinzi, cum ajung banii la cauză și ce se întâmplă dacă ceva nu merge.",
  },
};

const TOPICS: {
  id: string;
  icon: keyof typeof Icons;
  title: string;
  intro: string;
  entries: { q: string; a: string }[];
}[] = [
  {
    id: "licitare",
    icon: "auction",
    title: "Licitezi",
    intro:
      "O licitație nu are ceas. Rămâne deschisă până când vânzătorul acceptă o ofertă — și nu neapărat pe cea mai mare.",
    entries: [
      {
        q: "Cât timp am la dispoziție?",
        a: "Cât ține anunțul deschis. Nu există numărătoare inversă și nimic nu se închide singur, așa că nu trebuie să stai cu ochii pe ceas.",
      },
      {
        q: "Îmi pot retrage oferta?",
        a: "Da, atât timp cât vânzătorul nu a acceptat-o încă. O retragi din pagina licitației, fără să dai socoteală nimănui.",
      },
      {
        q: "Am câștigat. Ce urmează?",
        a: "Plătești în contul de garanție, vânzătorul expediază, iar tu confirmi că ai primit coletul. Abia atunci pleacă banii mai departe.",
      },
    ],
  },
  {
    id: "vanzare",
    icon: "wallet",
    title: "Vinzi",
    intro:
      "Alegi cauza și cât din preț merge la ea — între 5% și 100%. Restul rămâne al tău.",
    entries: [
      {
        q: "Cine alege cauza?",
        a: "Tu, dintre cauzele verificate cu documente. Procentul îl scrii tot tu, când publici anunțul.",
      },
      {
        q: "Pot accepta o ofertă mai mică?",
        a: "Da. Accepți oferta pe care o vrei, nu pe cea mai mare — cumpărătorul contează la fel de mult ca prețul.",
      },
      {
        q: "M-am răzgândit după ce am acceptat.",
        a: "Poți renunța la acceptare cât timp nu s-a făcut plata, iar anunțul se întoarce la ofertele primite.",
      },
    ],
  },
  {
    id: "escrow",
    icon: "escrow",
    title: "Plăți și protecție",
    intro:
      "Banii stau într-un cont de garanție până când confirmi că ai primit ce ai cumpărat.",
    entries: [
      {
        q: "Când ajunge donația la cauză?",
        a: "După ce confirmi primirea coletului. Până atunci nimeni nu se atinge de bani — nici vânzătorul, nici cauza.",
      },
      {
        q: "Coletul nu a ajuns sau nu arată ca în poze.",
        a: "Deschizi o sesizare din pagina comenzii. Banii rămân blocați până se lămurește, iar echipa noastră intră între voi.",
      },
      {
        q: "Primesc o dovadă a donației?",
        a: "Da. După ce comanda se încheie, găsești documentele în „Portofel”, alături de mișcările contului tău.",
      },
    ],
  },
  {
    id: "livrare",
    icon: "delivery",
    title: "Livrare",
    intro:
      "Vânzătorul alege curierul și expediază după plată. Tu urmărești coletul din pagina comenzii.",
    entries: [
      {
        q: "Cine plătește transportul?",
        a: "Costul este trecut în anunț înainte să licitezi, așa că știi totul dinainte.",
      },
      {
        q: "Pot ridica personal?",
        a: "Dacă vânzătorul a bifat ridicarea personală, o vezi în anunț și o alegi la finalizarea comenzii.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <PageTransition>
      <PageTitle>Centru de ajutor</PageTitle>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <p className="font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-3xl">
          Cu ce te putem ajuta?
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          Întrebările pe care le primim cel mai des, cu răspunsuri scurte. Dacă
          a ta nu este aici, scrie-ne — răspunde un om.
        </p>

        <nav aria-label="Subiecte" className="mt-5 flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <Link
              key={topic.id}
              href={`#${topic.id}`}
              className="rounded-xl bg-ink-50 px-3 py-2 font-display text-sm font-bold text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {topic.title}
            </Link>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-8">
          {TOPICS.map((topic) => {
            const Icon = Icons[topic.icon];
            return (
              <section key={topic.id} id={topic.id} className="scroll-mt-24">
                <div className="flex items-start gap-3">
                  <IconBubble tone="primary" size="md">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </IconBubble>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-extrabold text-ink-900">
                      {topic.title}
                    </h2>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-600">
                      {topic.intro}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 flex flex-col gap-3">
                  {topic.entries.map((entry) => (
                    <div
                      key={entry.q}
                      className="rounded-2xl bg-ink-50 px-4 py-3.5"
                    >
                      <dt className="font-display text-[15px] font-extrabold text-ink-900">
                        {entry.q}
                      </dt>
                      <dd className="mt-1 text-[15px] leading-relaxed text-ink-700">
                        {entry.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <Card className="mt-10">
          <h2 className="font-display text-lg font-extrabold text-ink-900">
            Tot nu ai găsit răspunsul?
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-600">
            Scrie-ne și îți răspundem în cel mult o zi lucrătoare. Dacă e vorba
            de o comandă, spune-ne numărul ei și mergem direct la subiect.
          </p>
          <ButtonLink href="mailto:ajutor@bid4.ro" className="mt-4">
            Scrie-ne
          </ButtonLink>
        </Card>
      </main>
    </PageTransition>
  );
}
