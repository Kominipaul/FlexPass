# FlexPass

Multi-location gym management platform built with Go and PostgreSQL.

This repository currently contains the **client-side front end** — two
separate, fully working demo apps sharing one codebase:

- **Member portal** (`/`) — the app a gym member uses day to day: sign up,
  manage their membership, book classes, check in.
- **Staff dashboard** (`/admin`) — the app front-desk and manager staff use:
  scan members in, manage the roster, run classes/capacity, watch live
  traffic insights.

They are genuinely separate products, not a toggle on one page — different
login screens, different auth, different layout, different navigation. A
staffer never sees member chrome and a member never sees staff chrome; the
only thing they share is the deployment. Both run entirely in the browser
against a mock API layer instead of the production Go service, so there's no
server setup — real forms, real validation, real state, real interaction.

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

Open the printed local URL — it lands on the **member portal** login. Sign
in with the seeded demo member:

- **Email:** `demo@flexpass.app`
- **Password:** `flexpass123`
- This account has two-factor sign-in enabled — the verification code screen
  shows the demo code directly in a banner (no real SMS/email is sent).

Or tap **"Create an account"** to sign up as a brand new member and pick
your own starting plan.

For the **staff dashboard**, go to `/admin` (or tap "Staff sign in →" on the
member login screen) and sign in with a seeded staff account:

- **Email:** `staff@flexpass.app` · **Password:** `flexpass123` (manager —
  full access)
- **Email:** `riley@flexpass.app` · **Password:** `flexpass123` (front desk)

Both a member session and a staff session can be signed in at the same time
in the same browser — they're stored under separate keys and don't interfere
with each other.

Other scripts:

```bash
npm run build     # production build (tsc -b && vite build)
npm run preview   # preview the production build locally
npm run lint      # eslint
```

## What's implemented

Everything below is real, interactive, and backed by state that persists
across reloads (via `localStorage`) — not static mockups.

### Member portal (`/`)

**Account & security**
- Sign up (2-step: account details → choose a starting plan)
- Sign in with email + password
- Optional two-factor authentication — a 6-digit secure code step at login
  (toggle it on/off in Settings)
- Forgot password → reset via a emailed-style 6-digit code
- Edit profile (contact info, date of birth, address, emergency contact)
- Change password, with a live password-strength meter
- Digital membership card with a rotating access token (canvas-drawn QR,
  refreshes on a countdown) and a 4-digit check-in PIN (regenerate anytime)
  — the "secure code" a member uses at the gym door
- Delete account / reset all demo data

**Membership & plans**
- Dashboard summary: days left in the billing cycle (progress ring), plan,
  renewal date
- Full plan comparison (Basic / Standard / Elite, monthly or yearly) with an
  upgrade/downgrade flow; plans also gate which club locations they unlock
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

### Staff dashboard (`/admin`)

**Front Desk (scanner)**
- Pick a member (or "simulate scan" a random one) and run a pass through the
  turnstile reader — a scan animation resolves to a granted/denied result
  with sound feedback (Web Audio beep, mutable)
- Access decisions run through the same `evaluateAccess` logic the member
  detail view previews, so what the scanner says and what staff see on a
  member's card always agree: expired, frozen, cancelled, or wrong-club
  memberships are refused with the specific reason shown
- Live door log of recent scans, granted and denied

**Members**
- Every member across both locations, searchable by name/ID/email, filterable
  by location and status (active / expiring / expired / frozen / cancelled)
- Per-row Extend (add days to the membership) and Freeze/Unfreeze
- Member detail modal: plan, home location, lifetime visits, last check-in,
  and a live "door result if scanned right now" preview
- Membership extension automatically lifts a freeze

**Classes**
- Every class and group across both locations, with live fill (booked ÷
  capacity for the next occurrence, or roster size for ongoing groups)
- Add a new class/group (name, instructor, schedule, location, capacity,
  description) or delete one — deleting cancels its bookings/memberships and
  notifies affected members
- View roster for any class or group

**Insights**
- Scope every metric to one location or both: check-ins today, active
  memberships, peak hour, refused scans today
- Traffic-by-hour and location-comparison charts (hand-built SVG bar charts,
  computed from real check-in data — no fixture arrays)
- Class fill rate and membership mix (plan distribution + MRR) computed live

## Tech stack & architecture

- **React 18 + TypeScript + Vite**, **React Router v6**, **Tailwind CSS**,
  **lucide-react** icons — no heavy UI framework, everything in
  `src/components/ui` is hand-built and shared between both apps.
- **Two apps, one router**: `App.tsx` nests two independent route subtrees —
  a member subtree (`AuthProvider` → `GymDataProvider`) and an admin subtree
  under `/admin` (`StaffAuthProvider` → `AdminDataProvider`). Each has its
  own auth context, its own data context, its own layout and guarded routes
  (`ProtectedRoute`/`GuestRoute` vs `AdminProtectedRoute`/`AdminGuestRoute`).
  They only share `ToastProvider` and the browser router itself — cross-app
  navigation is two plain links ("Staff sign in →" / "Member sign in →") on
  the two login screens.
- **Mock backend** (`src/lib/db.ts` + `src/lib/seedData.ts`): simulates a
  real API — async functions with network-like latency, seeded realistic
  data (multiple locations, a 12-member roster covering every membership
  status, staff accounts, door-scan history), persisted to `localStorage`.
  Swapping this for real `fetch` calls against the Go backend later
  shouldn't require touching any page — the four contexts are the only
  things that talk to it.
- **State**: `AuthContext` owns the member session; `DataContext` owns
  everything else for the signed-in member. `StaffAuthContext` owns the
  staff session (a separate `localStorage` key, so a member and a staffer
  can be signed in simultaneously in one browser); `AdminDataContext` owns
  the location-scoped operational data staff act on.
- **Design system**: a dark, industrial "iron & volt" theme — CSS custom
  properties in `src/index.css` (background/surface/ink tones, a volt-yellow
  primary accent, an ember secondary accent, status colors) mapped into
  `tailwind.config.js`, plus a shared `Tone` type (`src/lib/colors.ts`) so
  every badge, avatar, and chart across both apps pulls from the same
  palette.

```
src/
  components/
    ui/            shared UI kit used by both apps (Button, Card, Modal, …)
    admin/          admin-only widgets (StatusPill, charts, Field)
    layout/         AppLayout/AuthLayout (member), AdminLayout/AdminAuthLayout (staff)
  context/          AuthContext, DataContext, StaffAuthContext, AdminDataContext, ToastContext
  lib/              mock backend, access-control logic, formatting, validation
  pages/            one file per member route, plus pages/admin/ for staff routes
  types/            shared domain types
```

## Notes

- This is a **client-side demo**: all "network" calls are mocked with
  artificial latency, and data lives in your browser's `localStorage`. Use
  **Settings → Danger zone → Reset demo data** (member side) to start over;
  clearing site data resets the staff side too, since it's the same origin.
- Two-factor and password-reset codes are shown directly on screen (labeled
  "Demo mode") since there's no real email/SMS backend yet — the UX flow is
  otherwise exactly what a production version would look like.
- Fonts (Geologica / IBM Plex Sans / IBM Plex Mono) load from Google Fonts
  with a system-font fallback stack, so the app still looks and reads fine
  in network-restricted environments.
