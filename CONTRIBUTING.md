# Contributing to bid4

Bug reports, fixes and feature proposals are all welcome. This document covers
the setup, the checks that must pass, and the conventions the codebase holds to.

## Environment

Docker Desktop, JDK 21 and pnpm are required. Follow the
[local setup in the README](README.md#-local-setup); in short:

```bash
cp .env.example .env     # BID4_JWT_SECRET needs real entropy
docker compose up -d     # PostgreSQL, Redis, MinIO, Mailpit
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
cd frontend && pnpm install && pnpm dev
```

Use the pinned package manager: `corepack enable` resolves `pnpm` to the version
declared in `frontend/package.json`, which is the version CI installs.

Most work on the web application needs none of the above. With
`NEXT_PUBLIC_USE_MOCK=true` it serves a seeded dataset from `src/lib/mock`, so
there is no database to provision and no account to register. The `dev` profile
seeds four demo accounts on the API side; both are documented in the README.

Payment, delivery and email run against stub implementations by default, so no
third-party account is needed for any part of the codebase. Each sits behind an
interface — `PaymentGateway`, `CourierGateway`, `JavaMailSender` — selected by
configuration; a new provider is a new adapter, not a change to the domain.

## Required checks

Run what CI runs before opening a pull request.

```bash
cd backend && ./mvnw verify
```

Spotless first, then the suite. Testcontainers provisions real PostgreSQL, Redis
and MinIO instances, so Docker must be running; a broken migration fails here
rather than at deployment.

```bash
cd frontend
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm exec eslint src --max-warnings=0
pnpm exec vitest run
pnpm exec next build
```

`next typegen` runs first because `PageProps` and `LayoutProps` are generated
into `.next/types`, which the typecheck cannot resolve on a clean checkout
otherwise. The lint budget is zero warnings: fix the warning, or silence it at
its line with a stated reason.

## Pull requests

- Branch from `main`; keep each pull request to a single change.
- State what changed and why. Reference an issue where one exists.
- Add or update tests for any behaviour you change. A new endpoint gets an
  endpoint test; a rule about money gets a test that names the amounts.
- Update the README, `.env.example` or `frontend/.env.example` whenever you add
  configuration or change a setup step.
- Schema changes are new `V*.sql` migrations. Never edit a migration that has
  already run.
- CI must be green before merge.

Commit messages follow Conventional Commits — `feat:`, `fix:`, `chore:`,
`refactor:`, `test:` — with a subject describing the change in terms of its
effect, and a body explaining the reasoning where it is not self-evident.
`git log` is the reference for tone and length.

## Code style

Spotless, ESLint and TypeScript are authoritative. Run the checks and address
what they report rather than working from a separate style guide. Beyond that,
follow the conventions of the file you are editing: naming, structure and
comment density.

Two conventions the tooling cannot enforce:

- **User-facing copy is Romanian; code, comments and identifiers are English.**
  Any string a visitor can read is Romanian, validation messages included.
- **Comments are reserved for what the code cannot state** — a browser quirk, a
  specification detail, or a decision whose alternative appears preferable until
  explained.

## Code organisation

```
backend/src/main/java/ro/bid4/backend/
  <feature>/            domain, repo, service, api — one directory per feature
  common/               errors, money, paging, text, audit, configuration
  security/             filter chain, JWT, rate limiting
frontend/src/
  app/                  routes; _components/ beside the route that uses them
  components/           shared components; ui/ is the design system
  lib/api/              the data seam
  lib/mock/             the seeded dataset, imported only by lib/api
```

Three constraints matter more than the rest.

**The backend is packaged by feature, not by layer.** A feature owns its
entities, repository, service and controller, so a change to causes is contained
to one directory. Five ArchUnit rules enforce what can be enforced and fail the
build: controllers must not reach repositories or domain entities, `common` must
not depend on any feature, repositories must be interfaces, and field injection
is prohibited.

**Monetary amounts are integer bani.** `long` in Java, the branded `Bani` type
in TypeScript. No `double`, no `float`, and no arithmetic on formatted strings.
`lib/money.ts` owns the fee split on the client; the ledger owns it on the
server and rejects any movement whose sides do not sum to zero.

**The UI imports from `lib/api`, never from `lib/mock`.** This is what allows
`NEXT_PUBLIC_USE_MOCK` to replace the data layer without touching a component. A
component that reaches into the mock layer breaks the live build in a way no
test will catch.

## Reporting bugs

Open an issue with steps to reproduce, the expected result and the actual one.
Include your operating system, whether you were running against the mock layer
or the live API, and any relevant console or server output. The `X-Request-Id`
from a failed response is worth including — it correlates with the server log.

For anything security-related, do not open a public issue. See
[SECURITY.md](SECURITY.md).
