/**
 * How long a notification sticks around.
 *
 * Mirrors src/lib/notificationPolicy.ts. There's no separate cleanup job —
 * `GET /api/me/notifications` sweeps anything past its TTL right before it
 * reads, the same lazy-expiry pattern an open PIN window uses (see
 * pinPolicy.ts). Notifications are informational, not records anyone needs
 * kept — nothing else in the app reads them once they've scrolled past, so
 * there's no reason to keep them (or the table) growing forever.
 */
export const NOTIFICATION_TTL_DAYS = 30
