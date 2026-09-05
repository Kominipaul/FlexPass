/**
 * How long a notification sticks around before the server sweeps it —
 * mirrors server/src/domain/notificationPolicy.ts. Exists on this side
 * purely so the UI can say the number out loud rather than leave the
 * 30-day cleanup as a silent thing that happens to a member's history.
 */
export const NOTIFICATION_TTL_DAYS = 30
