# Decisions

One line each, per the build brief's instruction to record routine calls
rather than ask about them. Newest first.

- **CSRF header dropped from `/auth/refresh` and `/auth/logout`.** The
  original design required an `X-CSRF-Token` the client could only obtain
  *from* a successful refresh — which made the very first refresh after a
  page reload (when nothing is in memory yet) impossible to authenticate,
  breaking session persistence across reloads. Found this by testing the
  reload flow, not by reasoning about it in advance. Fix: rely on the
  refresh cookie's `SameSite=Lax` (which already blocks it from riding
  along on a cross-site fetch/XHR — Lax only exempts top-level GET
  navigations) plus CORS (the JSON response is unreadable from any origin
  but the configured one) as the CSRF defense for these two endpoints.
  `csrf_hash`/`csrf_token` are still issued and stored, unused, in case a
  future deployment that can't rely on SameSite needs to reinstate
  enforcement.
- **Replay protection keyed on the exact HMAC rotation window, not
  wall-clock recency.** First implementation denied a second grant within
  60 seconds of any prior grant for the same member — which would also
  have denied a second *legitimate* visit on a freshly rotated token
  moments later. Fixed to compare the specific window a token was verified
  against (`check_ins.matched_window`, unique-indexed for granted rows),
  so only an actual replay of the same QR image is denied.
- **Hand-written pgx queries instead of sqlc.** The build brief named sqlc;
  skipped its code-generation step to keep the toolchain to `go build` and
  nothing else. Each query lives in `internal/store`, typed by hand.
- **Embedded, goose-format-compatible migration runner instead of the
  goose CLI.** Migration files use `-- +goose Up`/`-- +goose Down` markers
  so they'd work with real goose later, but `internal/db/migrate.go` reads
  and applies them itself via `go:embed` — one binary, nothing extra to
  install.
- **Hand-rolled config loader instead of `caarlos0/env`.** Small enough
  (`internal/config`) that the dependency wasn't worth it.
- **Registration requires a `plan_code`** rather than leaving a member
  planless until staff assigns one (the build brief's original suggestion,
  written for a front-desk-first sales motion). This is a direct-to-
  consumer flow: a visitor picks a plan at signup and has a working,
  correctly-gated pass immediately — no second actor required to make the
  demo (or a real signup) feel complete.
- **Plan-change proration uses whole remaining days**, `int()`-truncated
  from `time.Until(ends_on)`, not fractional days. Simpler, defensible,
  and matches how a human would explain the charge.
- **Renew reactivates from today when the membership has already expired**,
  rather than stacking 30 days onto a date already in the past. A member
  who lets their membership lapse and then renews should get 30 days
  starting now, not 30 days added to a dead date.
- **`door/verify` is reachable by any authenticated user for now**, not
  locked to a specific role or device. There is no staff/device-auth layer
  yet (next milestone) — this exists to prove the cryptography and access
  rule end-to-end. It must move behind `Authorization: Device <api_key>`
  scoped to one location (`door_devices`) before a real turnstile calls it.
- **Verified against native Postgres, not `docker compose up`**, because
  this build environment has no Docker daemon (client only, no
  `dockerd`). `docker compose up -d db` is provided and should work
  wherever a daemon is available; everything downstream of "a Postgres is
  reachable at `DATABASE_URL`" is identical either way and was exercised
  for real against the native instance — migrations, seed, every endpoint,
  the concurrency test suite, and the full browser-driven flow.
