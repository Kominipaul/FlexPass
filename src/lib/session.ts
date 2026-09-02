/**
 * Tracks which user id is "logged in" for this browser.
 * Honors a real remember-me distinction: remembered sessions live in
 * localStorage (survive closing the tab/browser); non-remembered sessions
 * live in sessionStorage (cleared when the tab closes) — same as a typical
 * production auth cookie setup (persistent vs. session cookie).
 */

const SESSION_KEY = 'flexpass:session'

export function saveSession(userId: string, remember: boolean): void {
  try {
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, userId)
      window.sessionStorage.removeItem(SESSION_KEY)
    } else {
      window.sessionStorage.setItem(SESSION_KEY, userId)
      window.localStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // ignore — demo storage is best-effort
  }
}

export function loadSession(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
