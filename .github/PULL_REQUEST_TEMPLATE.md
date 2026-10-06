## What this changes, and why

<!-- The effect of the change, and the reasoning where it is not self-evident.
     Reference an issue where one exists. -->

## Checks

<!-- CONTRIBUTING.md has the full commands. Tick what you ran locally. -->

- [ ] `cd backend && ./mvnw verify` — Spotless, the suite, and the ArchUnit rules
- [ ] `cd frontend && pnpm exec next typegen && pnpm exec tsc --noEmit`
- [ ] `pnpm exec eslint src --max-warnings=0`
- [ ] `pnpm exec vitest run`
- [ ] `pnpm exec next build`

## Where it applies

- [ ] Tests cover the behaviour this changes — an endpoint test for a new
      endpoint, and amounts named explicitly for anything about money
- [ ] A schema change is a new `V*.sql`; no migration that has already run was
      edited
- [ ] New configuration is in `.env.example` or `frontend/.env.example`, and in
      the README table
- [ ] User-facing copy is Romanian; code, comments and identifiers are English
- [ ] Monetary amounts are integer bani — no `double`, no `float`
- [ ] The web application still imports from `lib/api` and never from `lib/mock`
