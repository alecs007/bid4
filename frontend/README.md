# bid4 — frontend

Romanian charity auction platform. People bid on items and a seller-chosen
share of every sale goes to a verified cause.

Next.js 16 (App Router), TypeScript in strict mode, Tailwind v4. Package
manager is **pnpm**.

## Running it

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

```bash
pnpm build     # production build
pnpm lint      # eslint
pnpm exec tsc --noEmit
```

## Data

The app runs entirely on a mock layer today. `NEXT_PUBLIC_USE_MOCK=true`
(the default) serves seeded data from `lib/mock`; setting it to `false`
points every call in `lib/api/*` at `NEXT_PUBLIC_API_BASE` instead. UI code
imports from `lib/api` only, never from `lib/mock`, so the swap touches no
component.

Copy `.env.example` to `.env.local` to change either flag.

Seed accounts all use the password `bid4demo`:

| Account | Role |
| --- | --- |
| maria@bid4.ro | USER, individual |
| contact@zambet.ro | USER, organisation |
| operator@bid4.ro | OPERATOR |
| admin@bid4.ro | ADMIN |

In development a floating switcher jumps between them and can reset the
seeded world.

## Layout

```
src/app          routes
src/components   ui/ (design system), layout/, auctions/, causes/, icons/
src/lib          api/ (the backend seam), mock/, types/, money, config
```

`lib/config.ts` holds every fee, cap and timing. `lib/money.ts` owns the fee
split and keeps amounts in integer bani. `/design-system` renders the
component vocabulary.

A full integration guide, with the expected backend endpoints and the
escrow, shipping and state-machine rules, is still to be written.
