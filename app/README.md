# Power Life Gym — API + Member Portal

The real, working system behind the sales prototype: Go API, Postgres,
argon2id auth with rotating refresh tokens, a genuinely scannable rotating
QR door pass (HMAC-SHA256, independently verifiable client- and
server-side), capacity-safe class booking with waitlisting, and membership
freeze/renew/plan-change billing — wired to a real Vite/React/TypeScript
frontend. See `../docs/BUILD_PROMPT.md` for the full spec this was built
against, and `docs/DECISIONS.md` for judgment calls made along the way.

**Scope of this milestone: the member side only.** Staff dashboard, real
payments, and Greek e-invoicing (myDATA) are the next milestones — see
"What's stubbed" below.

## Two ways to run this

**With Docker** (if you have it): `docker compose up -d db`, wait for it
to report healthy, then `make migrate seed run`.

**Without Docker** (what this was actually built and verified against —
the sandbox this was developed in has no docker daemon): `make dev-db`
starts Postgres natively via `service postgresql start` against the same
schema. Everything downstream (`migrate`, `seed`, `run`) is identical
either way.

```bash
cp .env.example .env        # then edit if needed
export $(cat .env | xargs)  # or use direnv / your shell's preferred method
make dev-db                 # or: docker compose up -d db
make migrate
make seed                   # reference data + a rolling 14-day class timetable
make run                    # API on :8080

# in a second terminal
cd web && npm install
make web                    # frontend on :5173, proxying /api to :8080
```

Open http://localhost:5173/register — there is no seeded demo login,
because members only ever come from real registration (see `docs/DECISIONS.md`).

## Verifying it's real, not a mock

```bash
make test              # unit tests: password hashing, JWT, the HMAC door
                        # token, and the access-evaluation rule (table-driven,
                        # every priority-order case)
make test-integration   # fires 12 concurrent goroutines at a class with
                        # capacity 3 against a real Postgres, with -race —
                        # confirms exactly 3 book, the rest waitlist with
                        # dense positions, and cancelling promotes the head
                        # of the waitlist inside the same transaction
```

The end-to-end proof that matters most — a QR rendered on screen, pulled
off the canvas as raw pixels, decoded by an independent QR reader (not this
app's own code), and POSTed to `/api/v1/door/verify`, which grants or
denies using the exact same rule a real turnstile will — isn't a unit test
here; it was run and is described in the session's own summary. Reproduce
it any time with Playwright + `jsqr` against a running `make run` + `make web`.

## What's real here

- Argon2id passwords, JWT access tokens (15 min), rotating refresh tokens
  in an httpOnly cookie with reuse detection (a revoked token presented
  again kills the whole session family), login rate limiting.
- A member's door pass secret is fetched once and never re-sent; the QR
  token is HMAC-SHA256(secret, 15-second window), computed identically in
  Go (`internal/doorpass`) and TypeScript (`web/src/lib/doorpass.ts`) — the
  two implementations are locked together by a shared test vector
  (`TestTokenMatchesJSReferenceVector`).
- `/api/v1/door/verify` recomputes and checks that token, replay-guards on
  the exact rotation window (not on wall-clock recency — see
  `docs/DECISIONS.md`), and runs the access rule in a fixed priority order:
  expired → frozen → wrong-location-for-plan → expiring-soon → active.
- Class booking is capacity-safe: `SELECT ... FOR UPDATE` on the class row
  serializes concurrent bookers, so two people can never win the last seat;
  cancelling promotes the waitlist head in the same transaction.
- Freeze holds real days (extension on unfreeze is computed from days
  actually elapsed, not the requested duration); renew reactivates an
  expired membership from today rather than stacking onto a past date;
  plan changes prorate the remaining term into an invoice line.

## What's stubbed or deliberately out of scope

- **Staff/admin dashboard** — the scanner, member table, and class manager
  from the prototype have no API or UI yet. `door/verify` is reachable by
  any authenticated user for now; it must move behind per-location device
  auth (`door_devices`) before a real turnstile calls it.
- **Payments** — plan prices are charged nowhere; invoices are bookkeeping
  rows only. `internal/store` has room for a `PaymentProvider` interface
  per the build brief; not implemented yet.
- **Greek e-invoicing (myDATA/ΑΑΔΕ)** — `invoices.mydata_mark` exists in
  the schema and is never populated. Flagged as a compliance item, not a
  nice-to-have, before this goes near real Greek consumers.
- **Email** — no verification, reset, or notification emails send yet.
