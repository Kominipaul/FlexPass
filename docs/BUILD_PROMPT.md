# Product brief: Power Life Gym

The functional specification for FlexPass: the data model, the domain rules, and the
behaviour the running system is held to. Sections 3 and 4 are authoritative and are kept
current with the code.

> **Status.** This started life as a build brief written against a single-file UI
> prototype and targeting a Go backend. The product was built in TypeScript instead
> (§1), and both the prototype file and the Go implementation have since been removed
> from the repository. The domain rules below outlived that change and still describe the
> shipping system.

**Client:** Power Life Gym — Αρτέμιδος 130-134, Καλαμάτα, Greece. Two spaces:
*Αρτέμιδος* (bodybuilding, cardio, group classes) and the *Στούντιο Pilates* (Reformer).
Money is EUR. The interface was specified as Greek-first with English second; that has
not been built (§1) and the shipping UI is English-only.

The product: a real multi-user application — signup, login, roles, a database, an HTTP
API, and the UI running against it with no mock data anywhere in the bundle.

---

## 1. Stack

What is actually running:

| Layer | Choice |
|---|---|
| Language | TypeScript 5 on Node 22, ESM throughout |
| HTTP | Fastify 5 |
| DB | PostgreSQL |
| DB access | `pg` with hand-written SQL — no ORM, no query codegen |
| Migrations | one `server/src/schema.sql`, applied by `server/src/migrate.ts` |
| Auth | Argon2id passwords; opaque 32-byte session tokens in an HttpOnly cookie, stored only as SHA-256 |
| Validation | `zod` on request bodies |
| Config | env vars through `server/src/env.ts`; `server/.env.example` committed, secrets never in git |
| Logging | `pino` via Fastify, `pino-pretty` in dev, one line per request |
| Frontend | Vite 5 + React 18 + TypeScript + Tailwind 3, `react-router` 6, plain `fetch` behind `src/lib/db.ts` |
| Local dev | `npm run dev` runs API and web together; `server/scripts/pgdev.sh` runs a project-local Postgres on :55432 |

**Where this diverges from the original brief.** Recorded so the gap is visible rather
than mistaken for something already built:

- **Sessions, not JWTs.** The brief specified a short-lived access JWT plus a rotating
  refresh token. The build uses opaque server-side sessions instead — simpler to revoke,
  and nothing in the client needs to understand a token. §5 still describes the JWT design.
- **No i18n.** The brief made Greek the default language with `i18next`. The shipping UI
  is English-only. The bilingual `reason_code` messages in §4.2 are specified but not built.
- **No test suite.** §11 describes unit and Playwright coverage. There are currently zero
  test files in the repository, and no CI workflow.
- `sqlc`, `goose`, `testcontainers-go` and TanStack Query are not used and have no
  equivalent here.

---

## 2. Repository layout

```
src/                            # React 18 SPA — member portal and staff front desk in one bundle
  components/ui/                # shared kit (Button, Card, Modal, QrCode, …)
  components/admin/             # staff-only widgets (StatusPill, charts, Field)
  components/layout/            # member shell and staff shell
  context/                      # Auth, Data, StaffAuth, AdminData, Toast
  hooks/useCameraQrScanner.ts   # the real getUserMedia + jsQR capture loop
  lib/db.ts                     # the only file in the frontend that touches the network
  lib/progress.ts               # §4.4 week maths
  lib/access.ts                 # §4.2 display mirror — never the decider
  pages/                        # one file per member route; pages/admin/ for staff
  types/                        # domain types — imported by the server too
server/
  src/index.ts                  # Fastify entrypoint
  src/routes/                   # auth, member, classes, checkin, admin
  src/domain/access.ts          # §4.2 access evaluation (authoritative)
  src/domain/pinPolicy.ts       # §4.3 backup-PIN state machine
  src/domain/tokens.ts          # §4.1 HMAC check-in tokens — server-only, key never ships
  src/schema.sql                # the database
  src/seed.ts                   # reference data + demo roster
  scripts/pgdev.sh              # project-local Postgres, no sudo
docs/                           # this brief + the README screenshots
```

---

## 3. Data model

Write the migrations; these are the tables and the fields that matter. Add `id uuid default gen_random_uuid()`,
`created_at`, `updated_at` everywhere. Use `citext` for email, `timestamptz` for all times, store money as
`integer` cents with a `currency` column.

- **locations** — `code` (ART/PIL), `name_el`, `name_en`, `address_el`, `address_en`, `opens_at`, `closes_at`, `timezone` (Europe/Athens), `closed_weekdays smallint[]` (0 = Sunday) and **location_closures** (`location_id`, `on_date`, `reason`) for holidays and maintenance — both feed §4.4.
- **plans** — `code` (basic/group/premium), `name_el`, `name_en`, `price_cents`, `active`, `sort_order`.
- **plan_location_access** — `(plan_id, location_id)`. Basic and Group get ART; Premium gets ART + PIL.
- **plan_discipline_access** — `(plan_id, discipline_id)`. Basic: none. Group: all but Pilates. Premium: all.
- **disciplines** — `code` (pilates/functional/crossfit/trx/zumba/spinning), `name_el`, `name_en`, `icon`.
- **users** — `email`, `password_hash`, `role` (`member`|`staff`|`admin`), `locale` (`el`|`en`), `status`, `email_verified_at`, `last_login_at`.
- **members** — `user_id`, `member_code` (`PLG-1042`, unique, generated), `first_name`, `last_name`, `phone`, `birth_date`, `home_location_id`, `joined_on`, `door_secret bytea` (see §4.1), `backup_pin_hash` (see §4.3 — hashed, never stored or logged in the clear, and never used to look a member *up*).
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
- **pin_unlocks** — `member_id`, `location_id`, `opened_by_staff_user_id`, `opened_at`, `expires_at`, `attempts_left`, `override bool`, `status` (`open`|`used`|`locked`|`expired`|`cancelled`). See §4.3. At most one `open` row per member (partial unique index).
- **training_goals** — `member_id` (unique), `days_per_week smallint`, `rest_weekdays smallint[]`, `enabled bool`, `started_on`. See §4.4.
- **audit_log** — `actor_user_id`, `action`, `entity`, `entity_id`, `before jsonb`, `after jsonb`, `at`. Write to it on every staff mutation (extend, freeze, plan change, class cancel).

Seed (`server/src/seed.ts`) must reproduce the demo data exactly: two locations, three plans, six
disciplines, six Greek trainers, ~14 members across the tiers and statuses (active / expiring / expired /
frozen), ~12 classes over three days with the same fill levels, six invoices, two announcements.
The seeded demo account is `maria@example.gr` on Group Pass, so the Pilates up-sell path is visible.

---

## 4. Business rules — port these exactly

These rules live server-side and are authoritative;
the client may mirror them for instant feedback but must never be the decider.

### 4.1 Door access and the rotating QR

The pass shows a code that rotates every **60 seconds**. Make it real, not decorative:

- 60, not 15: the member pulls their phone out, unlocks it, finds the app and holds it up. A window
  shorter than that whole sequence just rotates the code in the reader's face and backs the queue up at
  18:30. A minute is still far too short for a screenshot of somebody else's code to be worth passing
  around, which is the only thing rotation defends against.
- Each member has a random 32-byte `door_secret`, issued at signup, rotatable by staff.
- Token = base32(HMAC-SHA256(secret, floor(unix_seconds / 60))[:10]), rendered as `PLG-XXXX-XXXX-XXXX`.
- The client fetches the secret **once** over HTTPS after login and computes tokens locally, so the pass
  works with a weak signal at the door; it never re-fetches per rotation.
- `POST /door/scan` takes `{token, location_id}` from an authenticated **device**, resolves the member by
  trying the current window and ±1, then evaluates access.
- Replay protection: a used `(member_id, window)` pair is rejected for the rest of its window.
- Every scan is written to `check_ins`, granted or denied, with a machine-readable `reason_code`.

### 4.2 Access evaluation (`server/src/domain/access.ts`)

Pure function, table-driven tests, evaluated in this order — the order is the rule:

1. Membership expired (`ends_on < today`) → **denied**, `EXPIRED`
2. Membership frozen → **denied**, `FROZEN`
3. Location not in the plan's `plan_location_access` → **denied**, `PLAN_LOCATION`
   (this is what stops a Basic or Group member entering the Pilates studio)
4. `ends_on` within 7 days → **granted**, `EXPIRING_SOON` (staff sees the warning)
5. Otherwise → **granted**, `ACTIVE`

Reason codes are returned as codes; the API returns both `el` and `en` message strings alongside, because
the reader screen shows both languages at once.

### 4.3 Backup PIN entry — staff-opened, member-scoped

The reader has **no keypad**. This is the whole design, and it is what keeps a memorable 4-digit PIN safe
at any member count: a PIN never identifies anybody, so two members sharing `4821` is a non-event and
"who just checked in?" is never ambiguous.

The flow:

1. A member turns up without their phone and asks the desk.
2. Staff find **them** — by name, `member_code` or email, photo ID if they want it — and
   `POST /staff/members/:id/pin-unlock` opens a window against that one `member_id`, at that location,
   with `attempts_left = 3` and `expires_at = now + 5 minutes`. At most one open window per member;
   opening a new one cancels any previous.
3. The reader now shows a keypad naming that member. `POST /door/pin-attempt {unlock_id, pin}` (device
   auth) compares the digits against **that member's** `backup_pin_hash` and nobody else's. There is no
   lookup by PIN anywhere in the system — do not add one.
4. A wrong PIN decrements `attempts_left` and writes a **denied** `check_ins` row against the named
   member with `reason_code = PIN_INCORRECT`, so somebody being probed is visible in the door log. At
   zero the window flips to `locked` and the keypad closes; staff must deliberately open a new one.
5. A correct PIN flips the window to `used` and runs the ordinary §4.2 access evaluation — a frozen or
   expired member is still refused. Never let the backup path skip the access rule.

**Allowance.** A member gets 3 backup entries per rolling 30 days, counted from `check_ins` rows with
`method = 'PIN'`. Past that, opening a window requires `override=true`, which is stored on the row with
the staff user who did it and surfaced in the staff UI. It is a soft cap on purpose: a hard block strands
a paying member at the door, and an override nobody can see is how "just tell them my PIN" quietly
becomes somebody's daily way in.

### 4.4 Progression (`src/lib/progress.ts`)

Pure functions, table-driven tests. Consecutive-*days* streaks are not a metric — nobody trains seven
days a week, so they reset weekly and mean nothing by Tuesday. The unit is a **week against a target the
member set themselves**.

- `training_goals.days_per_week` is the member's own target; `enabled = false` means they opted out and
  the API should stop returning progression at all.
- Weeks run Monday→Sunday in the location's timezone.
- **A week's target is capped by the days the club was open**: `min(days_per_week, open_days)`, where
  `open_days` excludes `locations.closed_weekdays` and any `location_closures` row in that week. A member
  aiming for 6 in a week with 5 open days needs 5.
- A week is *hit* when distinct days with a granted check-in ≥ target.
- **The current week is never a miss.** It is live until Sunday, so it can extend a streak but never end
  one. A week where the club was shut entirely is neutral — it neither extends nor breaks.
- Current streak = consecutive hit weeks back from the last completed one; best streak = the longest such
  run; consistency = hit ÷ completed weeks in the window.

### 4.5 Class booking

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

### 4.6 Membership lifecycle

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
GET    /me/backup-pin               allowance only (used / limit / window) — never the PIN
PUT    /me/backup-pin               {pin} rotate it
GET    /me/progress                 goal, weeks, streak, badges (404-equivalent empty when disabled)
PUT    /me/progress/goal            {days_per_week, rest_weekdays, enabled}
GET    /me/announcements
POST   /me/announcements/:id/cta    e.g. request the PT package → lead for the desk
GET    /classes?from&to&location&discipline
POST   /classes/:id/book            → 201 booked | 202 waitlisted | 403 PLAN_UPGRADE_REQUIRED
DELETE /classes/:id/book
GET    /me/bookings
```

**Staff**
```
POST   /door/scan                   {token, location_id}          (device auth)
POST   /door/pin-attempt            {unlock_id, pin}               (device auth, §4.3)
GET    /door/pin-unlock             the open window for this device's location, if any
GET    /staff/check-ins?location&date
GET    /staff/members?q&location&status&cursor
GET    /staff/members/:id
POST   /staff/members/:id/extend    {days}
POST   /staff/members/:id/freeze    {weeks} | /unfreeze
POST   /staff/members/:id/plan      {plan_id}
POST   /staff/members/:id/door-secret/rotate
GET    /staff/members/:id/pin-allowance              used / limit / window before deciding
POST   /staff/members/:id/pin-unlock  {override}     opens the keypad for this member only (§4.3)
DELETE /staff/pin-unlocks/:id                        cancel an open window
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

The frontend lives in `src/` — **do not redesign it**. The visual language, the colour
tokens and the Geologica/IBM Plex typography are signed off. Specifically:

- Keep the CSS custom properties and the Tailwind config as they stand.
- Components mirror the product's sections (`Pass`, `Classes`, `Membership`,
  `Announcements`, `Scanner`, `MemberTable`, `ClassManager`, `Analytics`, primitives).
- No mock data in the bundle. Every read and write goes through `src/lib/db.ts`; nothing is
  cached in the browser, so two devices on one account always agree.
- Every list needs an empty, loading and error state.
- Route guards by role. `/` → member portal, `/staff/*` → staff, `/admin/*` → admin.
- The member pass must work as an installable PWA with an offline shell: the pass screen has to render and
  compute a valid token with no connectivity, because gym basements have no signal.
- Keep the QR canvas renderer but feed it the real token; swap the hand-rolled matrix for a real QR
  encoder (`qrcode` npm) so a phone camera can actually read it.

---

## 8. Still stubbed — decide and wire

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
   scanner and the member pass live against the API. Includes the §4.3 backup-PIN path end-to-end: staff
   open a window by name, the reader accepts three tries against that member alone, the allowance and the
   override are enforced server-side.
5. **M4** — classes, bookings, waitlist, plan gating and the up-sell response + both class views live.
6. **M5** — invoices, announcements, analytics endpoints + staff analytics live, plus §4.4 progression
   (club closures in the schema and honoured by the week maths, goal editing, opt-out).
7. **M6** — PWA/offline pass, notifications, payment provider, hardening, deploy.

---

## 11. Definition of done

- Both apps — member portal and staff front desk — work against the real API with **zero mock data** in the frontend bundle.
- These flows pass as automated end-to-end tests (Playwright):
  1. Register → verify → staff assigns Group Pass → member's pass renders a valid token.
  2. Scan that token at Αρτέμιδος → **ΕΙΣΟΔΟΣ ΕΠΙΤΡΕΠΕΤΑΙ**; scan it at the Pilates studio → **ΕΙΣΟΔΟΣ ΑΠΑΓΟΡΕΥΕΤΑΙ**
     with `PLAN_LOCATION`; upgrade to Premium Pilates; scan again → granted.
  3. Book a Functional class to capacity; the next member is waitlisted; the first cancels; the waitlisted
     member is promoted and notified.
  4. Freeze from the member portal → the door refuses them; staff unfreeze → the door admits them, and
     `ends_on` has moved by the frozen days.
  5. Expired member is refused and appears in the door log with `EXPIRED`.
  6. Backup PIN: the reader offers no keypad on its own; staff open a window for one member; a wrong PIN
     three times locks it and leaves three `PIN_INCORRECT` rows against that member; a fresh window plus
     the right PIN grants entry; a fourth backup entry inside 30 days is refused without `override`.
  7. Progression: a member with a 4-day goal at a club closed Sundays hits the week on 4 visits, a public
     holiday drops that week's target to match the open days, and the live week never breaks the streak.
- Access rules, the PIN window state machine and booking concurrency have unit tests, including two
  simultaneous bookings for the last seat and two simultaneous PIN attempts on the last remaining try.
- Language toggle switches the entire app including API-returned messages; Greek uppercase drops the tonos.
- `npm run lint` and `npm run typecheck` clean; no `TODO` left in a request path.
- `README.md` gets a new engineer running locally in under 10 minutes.

---

## 12. How to work

- Sections 3 and 4 are the contract. If your reading of the code differs from this brief,
  say so before changing either.
- Make the routine calls yourself and record each in `docs/DECISIONS.md` with one line of reasoning.
  Only stop and ask about things that change the product: payment provider, myDATA scope, whether the Pilates
  studio is a separate location or an area of one club.
- Small, reviewable commits. Migrations are never edited after they are committed — add a new one.
- Test the rules, not the framework. Access evaluation, booking concurrency and token verification deserve
  exhaustive tests; CRUD handlers deserve one happy path and one auth failure.
- The established design is approved. Any visual change needs a reason and a note in `DECISIONS.md`.
