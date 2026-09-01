# Build brief: turn the Power Life Gym prototype into a real product

You are building the production system behind an existing, fully interactive UI prototype.
The prototype is the functional and visual specification. Read it before writing any code.

**Prototype:** `gymcore-prototype.html` on branch `claude/gymcore-management-prototype-gwsomf`
of `Kominipaul/FlexPass`. Single file, React + Tailwind + Lucide, all state in memory.
Open it in a browser and click through both views before you plan anything.

**Client:** Power Life Gym — Αρτέμιδος 130-134, Καλαμάτα, Greece. Two spaces:
*Αρτέμιδος* (bodybuilding, cardio, group classes) and the *Στούντιο Pilates* (Reformer).
Interface language is Greek by default, English second. Money is EUR.

Your job: a real multi-user application — signup, login, roles, a database, an HTTP API,
and the same UI running against it with no mock data left anywhere.

---

## 1. Stack

Use exactly this unless you hit a hard blocker (then say so once, in `DECISIONS.md`, and continue):

| Layer | Choice |
|---|---|
| Language | Go 1.23+ |
| HTTP | `net/http` + `chi/v5` router |
| DB | PostgreSQL 16 |
| DB access | `pgx/v5` + `sqlc` (generated, typed queries — no ORM) |
| Migrations | `goose`, SQL files, forward-only |
| Auth | Argon2id password hashing, short-lived JWT access token + rotating refresh token in an httpOnly cookie |
| Validation | `go-playground/validator` on request DTOs |
| Config | env vars via `caarlos0/env`, `.env.example` committed, secrets never in git |
| Logging | `log/slog`, JSON in prod, request ID on every line |
| Frontend | Vite + React 18 + TypeScript + Tailwind, TanStack Query for server state, `react-router` |
| i18n | `i18next` — port the prototype's `STR` dictionary, Greek default |
| Tests | `testing` + `testify`, integration tests against a real Postgres via `testcontainers-go` |
| Local dev | `docker compose up` brings up db + api + web; `Makefile` for everything else |
| CI | GitHub Actions: lint (`golangci-lint`), test, build |

---

## 2. Repository layout

```
cmd/api/main.go              # server entrypoint
cmd/seed/main.go             # loads the prototype's demo data
internal/config              # env config
internal/http                # router, middleware, handlers, DTOs
internal/auth                # password hashing, tokens, sessions, RBAC
internal/access              # door-access rules (pure functions, heavily tested)
internal/booking             # class capacity, waitlist
internal/billing             # invoices, plan changes
internal/store               # sqlc output + repository wrappers
internal/i18n                # message catalogue (el/en) for API-returned reasons
db/migrations/*.sql          # goose
db/queries/*.sql             # sqlc source
web/                         # Vite frontend, ported from the prototype
docs/DECISIONS.md            # every judgement call you make, one line each
```

---

## 3. Data model

Write the migrations; these are the tables and the fields that matter. Add `id uuid default gen_random_uuid()`,
`created_at`, `updated_at` everywhere. Use `citext` for email, `timestamptz` for all times, store money as
`integer` cents with a `currency` column.

- **locations** — `code` (ART/PIL), `name_el`, `name_en`, `address_el`, `address_en`, `opens_at`, `closes_at`, `timezone` (Europe/Athens).
- **plans** — `code` (basic/group/premium), `name_el`, `name_en`, `price_cents`, `active`, `sort_order`.
- **plan_location_access** — `(plan_id, location_id)`. Basic and Group get ART; Premium gets ART + PIL.
- **plan_discipline_access** — `(plan_id, discipline_id)`. Basic: none. Group: all but Pilates. Premium: all.
- **disciplines** — `code` (pilates/functional/crossfit/trx/zumba/spinning), `name_el`, `name_en`, `icon`.
- **users** — `email`, `password_hash`, `role` (`member`|`staff`|`admin`), `locale` (`el`|`en`), `status`, `email_verified_at`, `last_login_at`.
- **members** — `user_id`, `member_code` (`PLG-1042`, unique, generated), `first_name`, `last_name`, `phone`, `birth_date`, `home_location_id`, `joined_on`, `door_secret bytea` (see §4.1).
- **memberships** — `member_id`, `plan_id`, `starts_on`, `ends_on`, `status` (`active`|`frozen`|`expired`|`cancelled`), `auto_renew`, `price_cents`. One current membership per member (partial unique index on `status <> 'cancelled'`).
- **membership_freezes** — `membership_id`, `starts_on`, `ends_on`, `days_held`, `fee_cents`, `created_by`.
- **trainers** — `user_id` (nullable), `name_el`, `name_en`, `active`.
- **classes** — `location_id`, `discipline_id`, `trainer_id`, `title_el`, `title_en`, `starts_at`, `duration_min`, `capacity`, `level`, `status` (`scheduled`|`cancelled`), `created_by`.
- **bookings** — `class_id`, `member_id`, `status` (`booked`|`waitlisted`|`cancelled`|`attended`|`no_show`), `waitlist_position`, `booked_at`, `cancelled_at`. Partial unique index on `(class_id, member_id) where status in ('booked','waitlisted')`.
- **check_ins** — `member_id` (nullable on unknown token), `location_id`, `scanned_at`, `result` (`granted`|`denied`), `reason_code`, `device_id`, `staff_user_id`. This is the door log; it is append-only.
- **invoices** — `member_id`, `number` (ΑΠΥ-series), `issued_on`, `description_el`, `description_en`, `total_cents`, `status` (`paid`|`refunded`|`pending`), `payment_method`, `provider_ref`, `mydata_mark` (nullable, see §8).
- **announcements** — `kind` (`offer`|`news`), `title_el/en`, `body_el/en`, `cta_label_el/en`, `cta_action`, `starts_on`, `ends_on`, `target_plan_ids` (nullable array).
- **refresh_tokens** — `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by`, `user_agent`, `ip`.
- **door_devices** — `location_id`, `label`, `api_key_hash`, `last_seen_at`. The turnstile authenticates as a device, not a user.
- **audit_log** — `actor_user_id`, `action`, `entity`, `entity_id`, `before jsonb`, `after jsonb`, `at`. Write to it on every staff mutation (extend, freeze, plan change, class cancel).

Seed (`cmd/seed`) must reproduce the prototype's demo data exactly: two locations, three plans, six
disciplines, six Greek trainers, ~14 members across the tiers and statuses (active / expiring / expired /
frozen), ~12 classes over three days with the same fill levels, six invoices, two announcements.
The seeded demo account is `maria@example.gr` on Group Pass, so the Pilates up-sell path is visible.

---

## 4. Business rules — port these exactly

These already exist in the prototype's JavaScript. Move them server-side and make them authoritative;
the client may mirror them for instant feedback but must never be the decider.

### 4.1 Door access and the rotating QR

The pass shows a code that rotates every 15 seconds. Make it real, not decorative:

- Each member has a random 32-byte `door_secret`, issued at signup, rotatable by staff.
- Token = base32(HMAC-SHA256(secret, floor(unix_seconds / 15))[:10]), rendered as `PLG-XXXX-XXXX-XXXX`.
- The client fetches the secret **once** over HTTPS after login and computes tokens locally, so the pass
  works with a weak signal at the door; it never re-fetches per rotation.
- `POST /door/scan` takes `{token, location_id}` from an authenticated **device**, resolves the member by
  trying the current window and ±1, then evaluates access.
- Replay protection: a used `(member_id, window)` pair is rejected for 60 seconds.
- Every scan is written to `check_ins`, granted or denied, with a machine-readable `reason_code`.

### 4.2 Access evaluation (`internal/access`)

Pure function, table-driven tests, evaluated in this order — the order is the rule:

1. Membership expired (`ends_on < today`) → **denied**, `EXPIRED`
2. Membership frozen → **denied**, `FROZEN`
3. Location not in the plan's `plan_location_access` → **denied**, `PLAN_LOCATION`
   (this is what stops a Basic or Group member entering the Pilates studio)
4. `ends_on` within 7 days → **granted**, `EXPIRING_SOON` (staff sees the warning)
5. Otherwise → **granted**, `ACTIVE`

Reason codes are returned as codes; the API returns both `el` and `en` message strings alongside, because
the reader screen shows both languages at once.

### 4.3 Class booking

- A member may book only if their plan has `plan_discipline_access` for that discipline. Otherwise the API
  returns `403 PLAN_UPGRADE_REQUIRED` **plus the cheapest plan that would cover it** — the UI turns that
  into the up-sell button.
- Capacity is enforced in a transaction: `SELECT ... FOR UPDATE` on the class row, count active bookings,
  then insert. Never trust a client-side count.
- At capacity, the booking becomes `waitlisted` with the next position.
- Cancelling a `booked` seat promotes the head of the waitlist in the same transaction and queues a
  notification to that member.
- No booking or cancelling after `starts_at`; cancellation inside 2 hours of start counts as a late cancel
  (record it — gyms care about no-show behaviour).

### 4.4 Membership lifecycle

- **Freeze**: pauses billing; remaining days are held, not spent. On unfreeze, `ends_on` moves forward by
  the frozen duration. Freezes longer than 4 weeks carry a €9 fee recorded as a pending invoice line.
- **Extend** (staff): adds 30/90/365 days to `ends_on` and clears any freeze. Audit-logged.
- **Plan change**: takes effect immediately; prorate the difference into an invoice line. An upgrade must
  immediately grant the new access (a member who upgrades to Premium walks into the Pilates studio minutes later).
- A nightly job flips memberships to `expired` and emits `expiring_soon` notifications at 7 and 2 days.

---

## 5. Auth

- `POST /auth/register` — member self-signup: email, password, first/last name, phone, home location.
  Creates `users` + `members` with **no active membership**; the front desk assigns the plan. Sends a
  verification email; unverified accounts can log in but cannot book.
- `POST /auth/login` — returns an access JWT (15 min, in the response body) and sets a refresh token
  cookie (30 days, `HttpOnly`, `Secure`, `SameSite=Lax`, path-scoped to `/auth`).
- `POST /auth/refresh` — rotates the refresh token; detect reuse of a revoked token and kill the whole
  family (that means the token leaked).
- `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`.
- `GET /me` — user + member + current membership + plan access, one call, because the whole UI needs it on boot.
- **Roles**: `member` sees only their own data; `staff` gets scanner, members, classes at their location;
  `admin` gets everything plus pricing, announcements, staff accounts. Enforce in middleware *and* in queries
  (`WHERE member_id = $current_member` — never rely on the handler alone).
- Rate limit: 5 login attempts per minute per IP+email, exponential lockout after 10. Same for password reset.
- Argon2id: 64 MB memory, 3 iterations, 4 threads, 16-byte salt, 32-byte key. Store parameters with the hash.
- Passwords: minimum 10 characters, checked against a common-password list. No composition rules.
- CSRF: because refresh lives in a cookie, require a double-submit token on the refresh and logout endpoints.
- Door devices authenticate with `Authorization: Device <api_key>`; keys are hashed at rest and scoped to one location.

---

## 6. HTTP API

JSON, `/api/v1`, RFC 7807 problem responses, cursor pagination on lists, `Accept-Language` honoured
(`el` default). Every error carries a stable `code` the frontend can switch on.

**Member**
```
GET    /me
PATCH  /me                          name, phone, locale
GET    /me/pass                     door_secret (once), member_code, plan, location
GET    /me/membership               status, days_left, ends_on, plan, perks
POST   /me/membership/freeze        {weeks}
POST   /me/membership/unfreeze
POST   /me/membership/plan          {plan_id}  → prorated invoice
GET    /me/invoices
GET    /me/check-ins                the member's own door history
GET    /me/announcements
POST   /me/announcements/:id/cta    e.g. request the PT package → lead for the desk
GET    /classes?from&to&location&discipline
POST   /classes/:id/book            → 201 booked | 202 waitlisted | 403 PLAN_UPGRADE_REQUIRED
DELETE /classes/:id/book
GET    /me/bookings
```

**Staff**
```
POST   /door/scan                   {token, location_id}   (device auth)
GET    /staff/check-ins?location&date
GET    /staff/members?q&location&status&cursor
GET    /staff/members/:id
POST   /staff/members/:id/extend    {days}
POST   /staff/members/:id/freeze    {weeks} | /unfreeze
POST   /staff/members/:id/plan      {plan_id}
POST   /staff/members/:id/door-secret/rotate
GET    /staff/members/:id/door-preview?location_id=   dry-run of the access rule
GET    /staff/classes?location&from&to
POST   /staff/classes               create
PATCH  /staff/classes/:id           edit
DELETE /staff/classes/:id           cancel + notify booked members
GET    /staff/classes/:id/roster
POST   /staff/classes/:id/roster/:member_id/attended
GET    /staff/analytics/summary?location&date        check-ins, active members, peak hour, refusals
GET    /staff/analytics/hourly?location&date
GET    /staff/analytics/weekly?location
```

**Admin**: plans and pricing, plan access matrix, announcements CRUD, staff accounts, audit log.

---

## 7. Frontend

Port the prototype into `web/` as real components — **do not redesign it**. The visual language, the
colour tokens, the Geologica/IBM Plex typography, the bilingual copy and the Greek-first behaviour are
signed off. Specifically:

- Keep the CSS custom properties and the Tailwind config from the prototype's `<style>`/`tailwind.config`.
- Keep the `lang` stamping on the root element — Greek uppercasing must keep dropping the tonos.
- Split the single file into components mirroring its existing sections (`Pass`, `Classes`, `Membership`,
  `Announcements`, `Scanner`, `MemberTable`, `ClassManager`, `Analytics`, primitives).
- Replace `useState` mock data with TanStack Query hooks against the API. Optimistic updates on booking and
  freeze, rolled back on error — the instant feel is the point of the demo.
- Add the screens the prototype does not have, in the same visual language: login, register, forgot/reset
  password, email verification, a staff login, and an empty/loading/error state for every list.
- Route guards by role. `/` → member portal, `/staff/*` → staff, `/admin/*` → admin.
- The member pass must work as an installable PWA with an offline shell: the pass screen has to render and
  compute a valid token with no connectivity, because gym basements have no signal.
- Keep the QR canvas renderer but feed it the real token; swap the hand-rolled matrix for a real QR
  encoder (`qrcode` npm) so a phone camera can actually read it.

---

## 8. What the prototype fakes — decide and wire

- **Payments.** Recurring EUR card charges. Evaluate Viva Wallet (Greek market default, local acquiring)
  against Stripe (better DX). Implement one behind a `PaymentProvider` interface with a `mock` implementation
  so tests and the demo never touch a real gateway. Webhooks must be idempotent.
- **Greek e-invoicing (myDATA / ΑΑΔΕ).** Receipts issued to Greek consumers must be transmitted to myDATA and
  carry a MARK. Do not hand-roll this in v1: put invoicing behind an interface, store `mydata_mark`, and
  leave a documented integration point. Flag it to the client as a compliance item, not a nice-to-have.
- **Email.** Resend or Mailgun. Templates in Greek and English: verification, password reset, booking
  confirmation, waitlist promotion, membership expiring, freeze confirmation.
- **SMS / push.** Web push for waitlist promotion and class cancellation. SMS optional, behind the same interface.
- **Wallet passes.** Apple Wallet / Google Wallet pass as a stretch goal — attractive in a sales demo.

---

## 9. Non-functional

- `docker compose up` gives a working stack with seeded data and a documented demo login. This is the
  acceptance ritual; if it doesn't work, nothing else counts.
- Health: `/healthz` (process) and `/readyz` (db ping). Graceful shutdown with in-flight request draining.
- Timezone: store UTC, render Europe/Athens. Class times are wall-clock local; get DST right and test it.
- GDPR: `GET /me/export` (JSON of everything about the member), account deletion that anonymises rather than
  deletes check-in history, retention policy on `check_ins`, explicit opt-in for marketing announcements.
- Security: parameterised queries only, no string-built SQL; strict CORS allow-list; security headers; secrets
  from env; `govulncheck` in CI; no PII in logs (member codes are fine, emails are not).
- Backups: documented `pg_dump` schedule and a tested restore procedure.
- Load: assume 2,000 members, ~600 check-ins/day, spiky at 18:00-20:00. Index for it and prove it with an
  `EXPLAIN` on the door-scan and class-list paths.

---

## 10. Milestones

Ship each one working end-to-end. Do not build all the backend then all the frontend.

1. **M0** — repo skeleton, docker compose, migrations, seed, `/healthz`, CI green.
2. **M1** — auth complete (register, login, refresh, reset, roles) + login/register screens in the real design.
3. **M2** — members, plans, memberships, freeze/extend/plan-change + the member portal's Membership tab live.
4. **M3** — door secrets, rotating tokens, `/door/scan`, access rules with full test coverage + the staff
   scanner and the member pass live against the API.
5. **M4** — classes, bookings, waitlist, plan gating and the up-sell response + both class views live.
6. **M5** — invoices, announcements, analytics endpoints + staff analytics live.
7. **M6** — PWA/offline pass, notifications, payment provider, hardening, deploy.

---

## 11. Definition of done

- Both prototype views work against the real API with **zero mock data** in the frontend bundle.
- These flows pass as automated end-to-end tests (Playwright):
  1. Register → verify → staff assigns Group Pass → member's pass renders a valid token.
  2. Scan that token at Αρτέμιδος → **ΕΙΣΟΔΟΣ ΕΠΙΤΡΕΠΕΤΑΙ**; scan it at the Pilates studio → **ΕΙΣΟΔΟΣ ΑΠΑΓΟΡΕΥΕΤΑΙ**
     with `PLAN_LOCATION`; upgrade to Premium Pilates; scan again → granted.
  3. Book a Functional class to capacity; the next member is waitlisted; the first cancels; the waitlisted
     member is promoted and notified.
  4. Freeze from the member portal → the door refuses them; staff unfreeze → the door admits them, and
     `ends_on` has moved by the frozen days.
  5. Expired member is refused and appears in the door log with `EXPIRED`.
- Access rules and booking concurrency have unit tests, including two simultaneous bookings for the last seat.
- Language toggle switches the entire app including API-returned messages; Greek uppercase drops the tonos.
- `golangci-lint` and `go vet` clean; no `TODO` left in a request path.
- `README.md` gets a new engineer running locally in under 10 minutes.

---

## 12. How to work

- Read the prototype first and write `docs/DOMAIN.md` describing the rules you found in it. If your reading
  differs from this brief, say so before building.
- Make the routine calls yourself and record each in `docs/DECISIONS.md` with one line of reasoning.
  Only stop and ask about things that change the product: payment provider, myDATA scope, whether the Pilates
  studio is a separate location or an area of one club.
- Small, reviewable commits. Migrations are never edited after they are committed — add a new one.
- Test the rules, not the framework. Access evaluation, booking concurrency and token verification deserve
  exhaustive tests; CRUD handlers deserve one happy path and one auth failure.
- The prototype's design is approved. Any visual change needs a reason and a note in `DECISIONS.md`.
