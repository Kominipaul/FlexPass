/**
 * Thin, typed wrapper around localStorage so the rest of the app never
 * touches `window.localStorage` (or JSON.parse/stringify) directly.
 * Fails soft — if storage is unavailable (private browsing, SSR, etc.)
 * reads return the fallback and writes are silently ignored.
 */

const NAMESPACE = 'flexpass'

function keyFor(key: string): string {
  return `${NAMESPACE}:${key}`
}

function isStorageAvailable(): boolean {
  try {
    const testKey = `${NAMESPACE}:__probe__`
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export const storage = {
  available: isStorageAvailable(),

  get<T>(key: string, fallback: T): T {
    if (!storage.available) return fallback
    try {
      const raw = window.localStorage.getItem(keyFor(key))
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T): void {
    if (!storage.available) return
    try {
      window.localStorage.setItem(keyFor(key), JSON.stringify(value))
    } catch {
      // ignore quota / serialization errors in demo context
    }
  },

  remove(key: string): void {
    if (!storage.available) return
    try {
      window.localStorage.removeItem(keyFor(key))
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    if (!storage.available) return
    try {
      const keys = Object.keys(window.localStorage).filter((k) =>
        k.startsWith(`${NAMESPACE}:`),
      )
      keys.forEach((k) => window.localStorage.removeItem(k))
    } catch {
      // ignore
    }
  },
}
