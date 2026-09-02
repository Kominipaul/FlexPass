# FlexPass

Multi-location gym management platform built with Go and PostgreSQL.

This repository currently contains the **client-side front end** — two
separate, fully working demo apps sharing one codebase:

- **Member portal** (`/`) — mobile-first: almost every member opens this on
  their phone, so it's built for that first. It lands directly on a real,
  rotating, camera-scannable QR check-in code, not a dashboard — the one
  thing most visits start with shouldn't be a tap away.
- **Staff dashboard** (`/admin`) — the app front-desk and manager staff use:
  scan members in with a real device camera, manage the roster, run
  classes/capacity, watch live traffic insights.

They are genuinely separate products, not a toggle on one page — different
login screens, different auth, different layout, different navigation. A
staffer never sees member chrome and a member never sees staff chrome; the
only thing they share is the deployment. Both run entirely in the browser
against a mock API layer instead of the production Go service, so there's no
server setup — real forms, real validation, real state, real interaction.

The check-in code itself is not a placeholder graphic: it's a real QR image
(via the `qrcode` package) encoding an HMAC-SHA256-signed, time-boxed token,
and the front-desk scanner decodes it with a real device camera (via `jsQR`)
and cryptographically verifies it before ever checking membership status.
See **Real, verifiable check-in codes** below for exactly how, and its one
honest limitation.

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
- **Check In** page (the landing page, `/`) — a real, rotating, camera-scannable
  QR code that re-signs itself every 20s, plus a 4-digit PIN fallback
  (regenerate anytime) for a member without their phone. Tap the code to
  show it full-screen for easier scanning. See below for how it's secured.
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
- See visit history — staff-verified (QR or PIN) and self-logged visits both
  show up, tagged by method — plus current streak and weekly/8-week activity
  charts. It really does add up.
- "Log a visit" on Home is a lightweight self-report for unstaffed hours —
  distinct from, and clearly secondary to, the verified Check In flow above
- Invoices (paid/due), pay outstanding invoices, manage payment methods
- Notification center (renewals, class reminders, billing, security,
  achievements) with per-category preferences

### Staff dashboard (`/admin`)

**Front Desk (scanner)**
- A real camera scanner, on by default: requests the device camera, streams
  it live, and decodes QR codes out of the actual video frames — point it at
  a member's Check In screen and it reads it, the same as any real turnstile
  reader. No member picker, no "simulate scan" button.
- A 4-digit PIN fallback (its own tab) for a member without their phone —
  staff type the code, it's looked up for real, same access decision either way.
- Every scan — camera or PIN — is verified before anything else runs: a
  forged, tampered, or expired code is rejected on its signature alone, and
  still logged (as denied) against whoever it claimed to be, like a real
  access-control log would.
- Access decisions run through the same `evaluateAccess` logic the member
  detail view previews, so what the scanner says and what staff see on a
  member's card always agree: expired, frozen, cancelled, or wrong-club
  memberships are refused with the specific reason shown
- Live door log of recent scans, granted and denied, with sound feedback
  (Web Audio beep, mutable)

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

## Real, verifiable check-in codes

The QR on the Check In page and the PIN beneath it aren't decorative demo
stand-ins — this is what actually happens:

1. **Signing** (`src/lib/accessToken.ts`, member's browser). Every member has
   a random 256-bit `checkInSecret`, generated once at signup/seed time. The
   Check In page signs a compact token — `{uid, iat, exp}`, base64url-encoded
   — with real **HMAC-SHA256** (via the browser's SubtleCrypto), valid for a
   20-second window. It's re-signed automatically the moment the window
   rolls over, derived from wall-clock time — not a timer that resets
   whenever the page happens to mount, so it can't be kept "alive" by just
   not closing the tab.
2. **Encoding**. That token string is rendered as an actual QR bitmap by the
   `qrcode` package — real finder patterns, real error correction, a real
   image any QR reader can decode, always dark-on-light regardless of the
   app's theme (contrast is what makes a code reliably scannable, so it
   never gets themed away).
3. **Scanning** (`src/hooks/useCameraQrScanner.ts`, staff device). The
   front-desk scanner asks for the device camera, and on every frame draws
   the live video to a canvas and runs it through `jsQR` — a general-purpose
   decoder with no idea what FlexPass is. Whatever text it reads out of the
   image is exactly the token string above; nothing here is simulated.
4. **Verification** (`adminRecordScanByToken`, `src/lib/db.ts`). The decoded
   token names the member it claims to be; the scanner looks up *that
   member's* stored secret and re-derives the HMAC signature, comparing it
   with a timing-safe check. Only if it matches — right member, right
   signature, right time window — does it move on to the actual membership
   check (`evaluateAccess`). A wrong secret, a tampered signature, or a
   stale/replayed screenshot all fail right here, and it's still logged as a
   denied scan, same as a real reader rejecting a bad badge read.

The one honest limit: there's no backend yet, so the signing key a member's
code is signed with lives in the same client-side store their own app reads
it from, rather than only ever living on a server the client never sees. In
production that's the one thing that moves — server holds the secret and
signs on request, client displays what it's given, scanner verifies against
the server — without changing this token format, the QR rendering, or the
scanner at all. Everything else here (the crypto, the real image, the real
camera decode, the real signature check, the real per-member access
decision) is exactly what a production build would still be doing.

*(Camera access requires a secure context — `https://` or `localhost` — same
as any real site; this is a browser platform requirement, not something this
app can opt out of.)*

## Tech stack & architecture

- **React 18 + TypeScript + Vite**, **React Router v6**, **Tailwind CSS**,
  **lucide-react** icons — no heavy UI framework, everything in
  `src/components/ui` is hand-built and shared between both apps.
  **`qrcode`** renders the real check-in QR; **`jsQR`** decodes real camera
  frames on the scanner — the only two libraries doing anything the rest of
  the app couldn't do by hand.
- **Mobile-first member nav**: on `<lg` viewports the member app uses a fixed
  bottom tab bar (`MobileTabBar`) — Check In, Home, Classes, Activity, and a
  More tab that opens the full nav drawer — instead of a desktop sidebar
  squeezed into a hamburger menu. The sidebar takes over at `lg` and up.
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
    ui/            shared UI kit used by both apps (Button, Card, Modal, QrCode, …)
    admin/          admin-only widgets (StatusPill, charts, Field)
    layout/         AppLayout/AuthLayout/MobileTabBar (member), AdminLayout/AdminAuthLayout (staff)
  context/          AuthContext, DataContext, StaffAuthContext, AdminDataContext, ToastContext
  hooks/            useCameraQrScanner — the real getUserMedia + jsQR capture loop
  lib/              mock backend, access-control logic, accessToken (sign/verify), formatting, validation
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
