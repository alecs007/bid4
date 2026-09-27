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
pnpm build                        # production build
pnpm exec tsc --noEmit            # typecheck
pnpm exec eslint src --max-warnings=0
pnpm exec vitest run              # unit tests
```

## Security

The API authorises every request for itself; nothing here is a substitute for
that. What the web app owns is the part the API cannot see.

- **Response headers** — set in `next.config.ts`: a content policy, `nosniff`,
  `DENY` framing, a referrer policy, and a permissions policy that grants no
  hardware. `script-src` still carries `unsafe-inline`, because Next hydrates
  through inline scripts and pinning them needs a per-request nonce; the
  directives that do not depend on script injection — `frame-ancestors`,
  `base-uri`, `form-action`, `object-src` — are enforced.
- **Middleware** — a routing convenience, not a control. It reads a role from an
  httpOnly cookie to decide where to send someone before a page renders; a forged
  one renders a page whose data the API then refuses.
- **Redirects** — `safeRedirect` resolves a `?redirect=` against a probe origin
  and keeps it only if it lands on the same one. Pattern-matching for a leading
  slash is not enough: browsers fold `/\` into `//`, so `/\evil.com` reads as
  relative and resolves off-site.
- **Tokens** — the access token lives in memory only. Nothing puts it in
  `localStorage`, where any script on the page could read it.
- **Cache** — signing out empties the SWR cache. Keys carry the viewer's id, so
  one account cannot read another's entries, but the data does not need to
  outlive the session on a shared machine.

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

The sign-in page carries a development-only panel that signs straight in as
any of them; `NEXT_PUBLIC_SHOW_DEV_TOOLS=false` removes it, and a production
build never renders it.

## Layout

```
src/app          routes
src/components   ui/ (design system), layout/, auctions/, causes/, icons/
src/lib          api/ (the backend seam), mock/, types/, money, config
```

`lib/config.ts` holds every fee, cap and timing. `lib/money.ts` owns the fee
split and keeps amounts in integer bani. `/design-system` renders the
component vocabulary.

The backend lives under `../backend` and serves the contract these functions
name, from the root rather than under a prefix: `/auth/*`, `/auctions`,
`/causes`, `/orders`, `/inbox`, `/uploads`, and the rest. Its decisions, the request path and the
schema conventions are in `../backend/ARCHITECTURE.md`; how to run both halves
together is in the README at the repository root.
