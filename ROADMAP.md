# Roadmap

What bid4 does not do yet, why, and what closing each gap would take. The
domain model, the double-entry ledger and the order state machine are the
substance of the project and they are built; most of what follows is an adapter
to something outside the system, or an endpoint behind a screen that already
exists.

Three groups, in the order the project would benefit from them:

1. [**Gaps between the web application and the API**](#1-gaps-between-the-web-application-and-the-api)
   — a screen exists, the endpoint behind it does not.
2. [**The three simulated integrations**](#2-the-three-simulated-integrations)
   — payment, delivery and email, each already behind an interface.
3. [**Platform work**](#3-platform-work) — what a deployment would need that a
   local stack does not.

Nothing here is a design question that is still open. Where a decision has been
made, it is stated; where it has not, the item says so.

---

## 1. Gaps between the web application and the API

`NEXT_PUBLIC_USE_MOCK=true` serves everything from `frontend/src/lib/mock`, and
the web application is feature-complete against it. The API implements most of
the same contract, but not all of it. Each item below is a screen that works
today against the seeded dataset and stops working when
`NEXT_PUBLIC_USE_MOCK=false`.

### Cause submission and operator review

**Largest single gap.** `CauseController` serves `GET /causes`,
`/causes/trending` and `/causes/{idOrSlug}` and nothing else. The schema is
complete — `verification_status`, `verification_cap`, `verification_rejection`,
the private bucket for identity documents — and `CauseMapper` reads all of it.
Nothing writes it except `DevCatalogSeeder`.

Needed: `POST /causes` taking the submission wizard's payload with its uploaded
document references, and an operator surface —
`POST /causes/{id}/verification/approve` and `/reject`, both
`@PreAuthorize("hasAnyRole('OPERATOR','ADMIN')")`, the rejection carrying a
reason the organiser can read. The ArchUnit rules apply: the controller speaks
DTOs, the service owns the transition.

The front end is in `frontend/src/app/cont/cauze/noua/` and the API functions
it calls are in `frontend/src/lib/api/causes.ts`, which already names the
endpoints.

### Password reset

There is no reset flow at all. `LoginForm.tsx` records the gap at the point
where the link would go.

Needed: `POST /auth/forgot-password` and `POST /auth/reset-password`, a
single-use token on the model of the existing email-verification token — same
24-hour lifetime, same resend cooldown, same `tokens` table shape — and the
second message this system sends. A completed reset must raise `tokenVersion`,
for the reason in the next item.

### Account management, and the token-version trigger

`tokenVersion` is on `UserAccount`, stamped into every access token by
`JwtService`, and validated on every request by `TokenVersionValidator`. The
whole mechanism is in the filter chain and **nothing increments it**, because
neither endpoint that would exists.

- `PATCH /users/me` — display name, address, notification preferences.
- `POST /users/me/password` — verify the current password, set the new one,
  increment `tokenVersion`.
- `POST /auth/logout-all` — revoke every refresh family for the account and
  increment `tokenVersion`.

`POST /auth/logout` today revokes only the refresh token it is presented with.
That is correct for one session and is all it claims to do.

Until those exist, the ten-second invalidation window the design provides for
cannot be reached, and `SECURITY.md` says so rather than inviting reports
against it.

### Listing edits, delivery methods, payout methods

- `AuctionController` has `POST` and `DELETE /{id}` but no `PUT`/`PATCH`: a
  listing cannot be corrected after it is posted, only withdrawn and re-posted.
  Needs a rule about which fields stay editable once an offer exists — the
  donation share and the asking price are the ones that cannot move freely.
- `DeliveryMethodController` has `POST` only. No rename, no delete, no default.
- `PayoutMethod` and the `payout` block on `CauseResponse` are read-only. The
  organiser cannot set or change an IBAN.

### The operator surface generally

`POST /orders/{id}/dispute/resolve` is the only role-gated endpoint in the API.
Cause review is the missing piece above; beyond it an operator has no queue, no
audit view and no way to act on the `AuditLog` entries the system already
writes.

---

## 2. The three simulated integrations

Each sits behind an interface selected by configuration, so a provider is a new
adapter and not a change to the domain. This is the part of the design that was
planned for, and it is the reason these are the cheapest items on the list
despite being the most visible.

| Integration | Interface | Selected by | Stub |
| ----------- | --------- | ----------- | ---- |
| Payment | `PaymentGateway` | `bid4.payments.provider`, default `stub` | `StubPaymentGateway` |
| Delivery | `CourierGateway` | `bid4.shipping.provider`, default `stub` | `StubCourierGateway` |
| Email | `JavaMailSender` | `MAIL_HOST` / `MAIL_PORT` | Mailpit on `localhost:1025` |

### Payment

The ledger side is finished: checkout sessions, payment references, settlement,
failure handling, escrow entries, release and refund, and the partial unique
index that lets only one order per listing reach a paid state. What is missing
is a provider on the other end of `PaymentGateway`.

The TODO markers through `frontend/src/lib/api/` name Stripe Connect, and the
split this platform performs is what Connect is for: the buyer's payment is
held, and release pays a seller and a cause from one charge. An adapter needs

- a Checkout session in place of the stub's reference, with
  `POST /orders/{id}/payment` becoming a redirect out and back;
- `Transfer`s on release, to the seller's and the cause's connected accounts;
- Connect onboarding for sellers and causes — this is what the
  `stripeOnboarded` flag on `CauseResponse` is for, and
  `StepGoal.tsx` records that `charges_enabled` is what should actually be
  read;
- `POST /webhooks/payments` mapped onto the provider's event types. **The
  authentication is already right**: HMAC-SHA256 over the raw body, compared in
  constant time, rejected before any order transition.

No card data exists anywhere in the system today, and an adapter built this way
keeps it that way.

### Delivery

`StubCourierGateway` generates locker lookups, AWBs, label documents and
tracking scans locally, and the inbound webhook is verified exactly as a
carrier's would be. `frontend/src/lib/api/shipping.ts` names the Sameday
Easybox endpoints the stub is shaped after — `/geolocation/lockers`, `/awb`,
`/awb/{awb}/status`.

One known inaccuracy: `OrderService` quotes the courier default weight because
a listing has no declared weight. Adding the field changes the quote, so it
changes a stored figure on the order and wants a migration and a test that
names the amounts.

### Email

One message is sent: the address-confirmation link. In development Mailpit
captures it and nothing leaves the machine.

Missing: a configured provider for production, and the notifications the
product implies — an offer received, an offer accepted, an order paid, a
dispatch deadline approaching, delivery confirmed, a dispute opened or
resolved. These should be driven from the order state machine's existing event
history rather than from the call sites that cause the transitions, and they
need a per-member preference to switch off, which is part of
`PATCH /users/me` above.

---

## 3. Platform work

### A nonce-based Content Security Policy

`script-src` permits `unsafe-inline`, which Next.js hydration requires. The fix
is a per-request nonce issued in middleware, threaded into the framework's
inline scripts and into the header, on both halves. Every directive that does
not depend on script injection — `frame-ancestors`, `base-uri`, `form-action`,
`object-src` — is already enforced.

### Social sign-in

`oauth_identities` exists in `V2`, with `OAuthIdentity`, `OAuthProvider` and
`OAuthIdentityRepository` beside it and a check constraint admitting `GOOGLE`
and `FACEBOOK`. The repository is referenced nowhere, there is no `oauth2Login`
in `SecurityConfig`, and the `spring-boot-starter-security-oauth2-client`
dependency was removed as unused — re-add it with the feature.

Needed: the client registrations under `spring.security.oauth2.client` guarded
so that absent credentials do not fail startup, a success handler that resolves
a provider subject to a `UserAccount` and mints the same session a password
login does, and account linking for an address that already holds a password.

### Pinned container images

`docker-compose.yml` pins `postgres:17-alpine` and `redis:7-alpine` but leaves
`minio/minio`, `minio/mc` and `axllent/mailpit` on `:latest`. A newcomer's
local stack can therefore break with no change to this repository. Pin all
three to a digest or a released tag.

### Restoring code scanning

Done — `.github/workflows/codeql.yml` was added for the move to a public
repository, where code scanning is free. Previously the analysis ran and the
upload was refused on every run, because publishing results on a private
repository is part of GitHub Advanced Security. The history is in
`backend/ARCHITECTURE.md`.

### Observability

Actuator exposes `health` on an unpublished port 8081 and that is the whole
surface. A deployment wants metrics, and the `X-Request-Id` that already
appears on every response and in every log line is most of a trace id — it
needs propagating rather than inventing.

### Tests

175 backend tests across 18 classes, 67 frontend tests across 6 files, with
Testcontainers provisioning real PostgreSQL, Redis and MinIO on every run. Two
things are absent:

- **End-to-end coverage.** Nothing exercises the browser against the live API,
  so the seam that `NEXT_PUBLIC_USE_MOCK` switches is only ever tested on one
  side at a time. This is where the gaps in section 1 would have been caught by
  a build rather than by reading.
- **Frontend breadth.** Six test files cover the money and utility layer well
  and the component tree barely.

### Deployment

There is no production configuration: no deployment manifest, no CD workflow,
no documented host. `docker-compose.yml` is a development stack — every port
bound to `127.0.0.1`, Mailpit in place of a mail provider, MinIO in place of
object storage. `backend.yml` builds the API image on every push and
deliberately never pushes it.

---

## Not planned

- **An auction clock.** Offers are measured against the asking price and a
  listing stays open until its seller settles it. `V6` and `V17` removed the
  clock and the bid step on purpose.
- **Floating-point money.** Integer bani throughout — `long` in Java, the
  branded `Bani` type in TypeScript.
- **Hibernate-generated schema.** Migrations are forward-only under
  `db/migration/`; `ddl-auto` is `validate`.
- **A second language.** User-facing copy is Romanian. Code, comments and
  identifiers are English.

---

Proposals are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). If an item here
is one you want to take on, open an issue referencing it first, so the design
questions it names get settled before the code is written.
