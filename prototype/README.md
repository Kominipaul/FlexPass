# GymCore — Frontend Prototype

An interactive, single-file frontend prototype for a 2-location gym management
platform, built for **FlexPass**. Covers both the member-facing **Client Portal**
and the **Staff / Admin Dashboard**, with a tab switcher at the top to toggle
between them.

## Run it

No build step required — it's a self-contained HTML file that loads React,
Babel (in-browser JSX transform) and Tailwind CSS from a CDN.

```bash
open prototype/gymcore.html      # macOS
xdg-open prototype/gymcore.html  # Linux
# or just double-click the file / drag it into a browser tab
```

## What's inside

**Client Portal**
- Digital membership card with a live, self-refreshing "QR code" (finder
  patterns + a randomized data field that reshuffles every 3s) and a pulsing
  security ring.
- Class schedule across both locations (CrossFit, Spinning, Yoga, Boxing)
  with location/type filters, live search, and working Book Spot / Cancel
  Booking buttons that update capacity in real time.
- Membership & profile tab: days-remaining tracker, freeze/resume account
  flow (with confirmation modal), plan upgrade modal, and billing history.

**Staff / Admin Dashboard**
- Front-desk QR scanner simulator: pick a member or hit "Simulate Member
  Scan" to trigger a validation check, with a full-screen ACCESS
  GRANTED / ACCESS DENIED result (color, icon, and an actual short audio
  chime/buzzer via the Web Audio API — mutable) plus a recent-scans log.
  Granted scans feed live into the analytics check-in chart.
- Multi-location member management table: search, filter by location/status,
  extend membership (+30 days), and freeze/unfreeze accounts.
- Class & capacity manager: add new classes (trainer, schedule, capacity),
  and view a live attendance roster per class.
- Analytics overview: today's check-ins, active memberships per location,
  peak-hour chart, and per-location snapshots — all derived live from
  in-memory mock state, so admin actions immediately show up here too.

## Notes

- All data is realistic in-memory mock state (14 members across "Downtown
  Hub" and "Northside Box", 10 classes, billing history, a check-in log) —
  there is no backend call; every interaction is fully functional client-side.
- Dark mode is the default and can be toggled from the top bar (`Tailwind
  darkMode: 'class'`); the whole UI is dark/light aware.
- Icons are a small hand-built set of stroke-based SVG components in the
  Lucide visual style, so the page has zero external icon-library
  dependency.
