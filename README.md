# FlexPass

Multi-location gym management platform built with Go and PostgreSQL.

This repository currently contains the **member portal** — the client-side
experience a gym member uses day to day. It's a fully working, extensive
front-end demo: real forms, real validation, real state, real interaction —
backed by a mock API layer instead of the production Go service, so it runs
entirely in the browser with no server setup.

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0b0e14" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
</p>

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL and sign in with the seeded demo account:

- **Email:** `demo@flexpass.app`
- **Password:** `flexpass123`
- This account has two-factor sign-in enabled — the verification code screen
  shows the demo code directly in a banner (no real SMS/email is sent).

Or tap **"Create an account"** on the login screen to sign up as a brand new
member and pick your own starting plan.

Other scripts:

```bash
npm run build     # production build (tsc -b && vite build)
npm run preview   # preview the production build locally
npm run lint      # eslint
```

## What's implemented

Everything below is real, interactive, and backed by state that persists
across reloads (via `localStorage`) — not static mockups.

**Account & security**
- Sign up (2-step: account details → choose a starting plan)
- Sign in with email + password
- Optional two-factor authentication — a 6-digit secure code step at login
  (toggle it on/off in Settings)
- Forgot password → reset via a emailed-style 6-digit code
- Edit profile (contact info, date of birth, address, emergency contact)
- Change password, with a live password-strength meter
- Digital membership card with a QR code and a 4-digit check-in PIN
  (regenerate anytime) — the "secure code" a member uses at the gym door
- Delete account / reset all demo data

**Membership & plans**
- Dashboard summary: days left in the billing cycle (progress ring), plan,
  renewal date
- Full plan comparison (Basic / Standard / Elite, monthly or yearly) with an
  upgrade/downgrade flow
- Freeze membership (date range + reason) and unfreeze
- Cancel membership (immediately or at period end) and reactivate
- Auto-renew toggle

**Classes & groups**
- Browse drop-in classes (book a specific upcoming session, with real
  capacity/waitlist logic) *and* ongoing groups (join once, e.g. a
  **Pilates** group, and attend every week)
- Filter by category and type, see instructor/location/schedule
- "My schedule" view of everything upcoming, plus past session history
- Join/leave groups, book/cancel class sessions

**Check-ins & billing**
- Check in (QR / PIN / front-desk) and see visit history, current streak,
  and weekly/8-week activity charts — it really does add up
- Invoices (paid/due), pay outstanding invoices, manage payment methods
- Notification center (renewals, class reminders, billing, security,
  achievements) with per-category preferences

## Tech stack & architecture

- **React 18 + TypeScript + Vite**, **React Router v6**, **Tailwind CSS**,
  **lucide-react** icons — no heavy UI framework, everything in
  `src/components/ui` is hand-built and shared.
- **Mock backend** (`src/lib/db.ts` + `src/lib/seedData.ts`): simulates a
  real API — async functions with network-like latency, seeded realistic
  data, persisted to `localStorage`. Swapping this for real `fetch` calls
  against the Go backend later shouldn't require touching any page —
  `AuthContext` and `DataContext` are the only things that talk to it.
- **State**: `AuthContext` owns the session and the current user;
  `DataContext` owns everything else for the signed-in member (membership,
  bookings, check-ins, billing, notifications) and refreshes from the mock
  API after each action.

```
src/
  components/       shared UI kit, layout shells, cross-page widgets
  context/          AuthContext, DataContext, ToastContext
  lib/              mock backend, formatting, validation, small helpers
  pages/            one file per route (auth/ + the signed-in app)
  types/            shared domain types
```

## Notes

- This is a **client-side demo**: all "network" calls are mocked with
  artificial latency, and data lives in your browser's `localStorage`. Use
  **Settings → Danger zone → Reset demo data** to start over.
- Two-factor and password-reset codes are shown directly on screen (labeled
  "Demo mode") since there's no real email/SMS backend yet — the UX flow is
  otherwise exactly what a production version would look like.
