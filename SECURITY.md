# Security Policy

## Reporting a vulnerability

Please do not report security issues through public GitHub issues, pull
requests or discussions.

Report privately by opening a
[security advisory](https://github.com/alecs007/bid4/security/advisories/new) on
this repository.

Include what the issue is and how it can be exploited, steps to reproduce or a
proof of concept, the affected area (a URL, an API route, or a file and line),
and whatever you can establish about impact.

You will receive an acknowledgement, and an update once the issue is resolved or
a decision is made not to act on it. Please allow a reasonable window for a fix
before disclosing publicly.

## Scope

In scope: this repository — the Spring Boot API under `backend/`, the Next.js
application under `frontend/`, the Flyway schema, and the local stack defined in
`docker-compose.yml`.

The following are of particular interest.

**Ledger and escrow integrity.** Any path that records an unbalanced movement,
releases escrow before the buyer has confirmed delivery, directs a donation to
the wrong cause, or alters the split between seller, cause and platform after an
offer has been accepted. A listing may carry several accepted offers at once,
of which only the first to pay becomes the sale; any sequence that brings two
orders on the same listing into a paid state, or that leaves a losing order
chargeable after the listing is sold, is a valid report.

**Horizontal access control.** Reading or modifying another member's orders,
listings, conversations or identity documents. Every read of member-scoped data
must be constrained to the requesting member; an order reachable by guessing its
number or payment reference is a valid report.

**Vertical access control.** Reaching an `OPERATOR` or `ADMIN` capability from
an ordinary account — verifying a cause, resolving a dispute, or moving money in
particular.

**Session handling.** Replaying a rotated refresh token without triggering
family revocation, retaining a valid session past a sign-out or password change,
defeating the account lockout, or extracting an access token from the browser,
where it is held in memory by design.

**Rate limiting.** Bypassing the authentication budget, or causing it to fail
open when Redis is unavailable, where it is specified to fail closed.

**The SSE inbox stream.** Obtaining or reusing a stream ticket that belongs to
another account, or receiving events from a conversation you are not party to.

**Upload and media handling.** Storing a file that the byte-signature probe
should have rejected, escaping a bucket with a crafted key, or retrieving a
private object — an identity document above all — through a route that should
not serve it.

**Injection.** Markup or script surviving the sanitizer into another member's
page, or input reaching SQL as anything other than a bound parameter.

Out of scope: vulnerabilities in third-party services and images (PostgreSQL,
Redis, MinIO, Mailpit), which should be reported to their vendors; findings that
require an already-compromised host or account; missing hardening with no
demonstrated impact; and automated scanner output presented without a working
case.

The following are known and need no report. Payment, delivery and email are
stubbed behind interfaces rather than connected to providers: no payment
provider is integrated and no card data exists anywhere in the system, courier
operations are generated locally, and the only message the system sends is the
address-confirmation link, captured by Mailpit in development. `script-src`
still permits `unsafe-inline`, which Next.js hydration requires until a
per-request nonce replaces it; the directives that do not depend on script
injection — `frame-ancestors`, `base-uri`, `form-action`, `object-src` — are
enforced.

## Testing guidelines

Test against your own local instance; the full stack starts with
`docker compose up -d`, as described in the [README](README.md). Do not run
denial-of-service or load tests against a deployed instance, do not access or
modify data belonging to other people, and do not attempt social engineering
against users or maintainers.

## Secrets

This repository contains no credentials. All configuration is supplied through
environment variables documented in [`.env.example`](.env.example) and
[`frontend/.env.example`](frontend/.env.example); `.env` files are gitignored
and must never be committed. The values in both templates are placeholders, and
the seeded demo accounts exist only under the `dev` profile, which refuses to
run against a database that already contains users.

CI scans every push for dependencies with known, fixed CVEs and for credentials
that reached the tree. If you believe a secret has been committed, report it
privately through the process above rather than opening an issue.
