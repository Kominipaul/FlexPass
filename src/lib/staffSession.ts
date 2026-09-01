/**
 * Tracks which staff id is "logged in" for this browser — a completely
 * separate key from the member session (src/lib/session.ts), so a person
 * can be signed into the member app and the staff app at once without
 * either session clobbering the other.
 */

const STAFF_SESSION_KEY = 'flexpass:staffSession'

export function saveStaffSession(staffId: string): void {
  try {
    window.localStorage.setItem(STAFF_SESSION_KEY, staffId)
  } catch {
    // ignore — demo storage is best-effort
  }
}

export function loadStaffSession(): string | null {
  try {
    return window.localStorage.getItem(STAFF_SESSION_KEY)
  } catch {
    return null
  }
}

export function clearStaffSession(): void {
  try {
    window.localStorage.removeItem(STAFF_SESSION_KEY)
  } catch {
    // ignore
  }
}
