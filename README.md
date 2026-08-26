# bid4

A Romanian charity auction platform. Someone lists an item, picks a verified
cause and chooses what share of the sale price goes to it. People bid. When the
auction closes the money is held in escrow until the buyer confirms the parcel
arrived — then the donation reaches the cause, the rest reaches the seller, and
bid4 keeps its fees.

Two halves: a Next.js frontend that has been built against a mock data layer,
and a Spring Boot backend that is now replacing it endpoint by endpoint.

## The repository

| Path | What it is |
| ---- | ---------- |
| `docker-compose.yml` | The whole local stack: Postgres, Redis, MinIO, and the API behind the `app` profile |
| `.env.example` | The shape of the secrets. Copy to `.env`, which is ignored |
| `.github/workflows/` | `backend.yml`, `frontend.yml`, `security.yml` |
| `backend/` | The API. See `backend/ARCHITECTURE.md` for decisions and the request path |
| `frontend/` | The web app. See `frontend/README.md` |

### Backend, the parts worth knowing

| Path | What it does |
| ---- | ------------ |
| `src/main/resources/application.yaml` | Every setting: datasource, Flyway, Redis, Tomcat limits, actuator, and the `bid4.*` tree |
| `src/main/resources/db/migration/` | Flyway migrations. Forward-only; the schema lives here, not in Hibernate |
| `common/config/Bid4Properties.java` | The `bid4.*` settings as a validated record. A bad value fails the boot |
| `common/error/` | `ErrorCode`, `ApiErrorResponse`, `GlobalExceptionHandler` — the one error shape the frontend parses |
| `common/text/TextSanitizer.java` | Strips markup and normalises Unicode on write |
| `common/web/` | `PageResponse` (the paged wire shape) and the `X-Request-Id` filter |
| `security/SecurityConfig.java` | The filter chain: CORS, headers, deny-by-default, JWT |
| `security/jwt/JwtService.java` | Issues access and refresh tokens |
| `security/ratelimit/` | Bucket4j buckets in Redis, three budgets, per caller |
| `identity/` | The users feature: entity, repository, service, controller, DTOs |

`Dockerfile` builds the API image; `pom.xml` pins the dependencies and wires
Spotless.

## Running it

You need Docker Desktop, JDK 21 and pnpm.

```bash
cp .env.example .env
```

Fill it in. For the JWT secret:

```bash
openssl rand -base64 48
```

Start the infrastructure:

```bash
docker compose up -d
```

That is Postgres on 5432, Redis on 6379 and MinIO on 9000, each bound to
`127.0.0.1` so nothing is exposed to the network. The API is not included by
default — it sits behind a profile, so the common case stays fast.

### The API

Open `backend/pom.xml` in IntelliJ as a project and run `BackendApplication`.
It reads the repo-root `.env` itself, so there is nothing to configure in the
run configuration.

- API: `http://localhost:8080`
- Health: `http://localhost:8081/actuator/health` — a separate port, deliberately
  not published by compose

Or from the terminal:

```bash
cd backend && ./mvnw spring-boot:run
```

### The web app

```bash
cd frontend && pnpm install && pnpm dev
```

`http://localhost:3000`. It runs on seeded mock data while
`NEXT_PUBLIC_USE_MOCK=true`; set it to `false` in `frontend/.env.local` to talk
to the real API instead.

### Everything in containers

```bash
docker compose --profile app up -d --build
```

Slower, because the image builds Maven from scratch. Worth running before a
deploy, not while writing code.

## Testing

```bash
cd backend && ./mvnw verify
```

Spotless first, then the suite. Testcontainers starts a real Postgres and Redis,
so Flyway migrates on every run and a broken migration fails the build rather
than the deploy. Docker Desktop has to be running.

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm exec eslint src --max-warnings=1 && pnpm exec next build
```

One eslint warning is expected: the commented-out `DevRoleSwitcher` import.

### By hand

Point Postman at `http://localhost:8080`. Register, and store the token from
the response:

```js
pm.environment.set("accessToken", pm.response.json().token);
```

Set the collection's authorization to `Bearer {{accessToken}}` and leave every
other request on "inherit". The refresh token is an httpOnly cookie, which
Postman keeps for you, so `/auth/refresh` works after a login without any setup.

Worth trying by hand: `/auth/me` with no token, with a forged token, and with a
real one; five wrong passwords followed by the right one; the same email
registered twice; `/auth/refresh` twice with the same cookie.

## Conventions

User-facing copy is Romanian; code, comments and identifiers are English. Money
is always an integer number of bani — `lib/money.ts` on one side, `long` on the
other — and never a floating point type. Comments are rare and short, and only
where the code cannot explain itself.
