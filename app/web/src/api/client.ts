import type { ProblemDTO, SessionResponse } from './types'

// The access token lives in memory only — never localStorage, never
// sessionStorage. The refresh token is an httpOnly, SameSite=Lax cookie
// the browser manages; on a fresh page load we have nothing in memory, so
// `bootSession()` spends that cookie once to mint a new access token
// before the app renders anything that needs one. SameSite=Lax is what
// protects the refresh call from CSRF here — it never rides along on a
// cross-site fetch/XHR in the first place, so there's no separate token
// this client needs to hold and echo back (see the matching comment in
// internal/httpapi/auth_handlers.go's handleRefresh).
let accessToken: string | null = null
let onSessionLost: (() => void) | null = null

export function setSessionLostHandler(fn: () => void) {
  onSessionLost = fn
}

function setSession(res: SessionResponse) {
  accessToken = res.access_token
}

function clearSession() {
  accessToken = null
}

export class ApiError extends Error {
  code: string
  status: number
  extra?: unknown
  constructor(problem: ProblemDTO, status: number) {
    super(problem.detail || problem.code)
    this.code = problem.code
    this.status = status
    this.extra = problem.extra
  }
}

async function parseJSON<T>(res: Response): Promise<T> {
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

interface FetchOpts {
  method?: string
  body?: unknown
  auth?: boolean // attach Authorization + retry-on-401-via-refresh (default true)
}

async function rawFetch(path: string, opts: FetchOpts): Promise<Response> {
  const headers: Record<string, string> = { 'Accept-Language': navigator.language }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth !== false && accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  return fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include', // always send the refresh cookie
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

/** Spends the refresh cookie for a new access token. */
export async function refresh(): Promise<SessionResponse | null> {
  const res = await rawFetch('/api/v1/auth/refresh', { method: 'POST', auth: false })
  if (!res.ok) return null
  const data = await parseJSON<SessionResponse>(res)
  setSession(data)
  return data
}

let refreshInFlight: Promise<SessionResponse | null> | null = null
function refreshOnce(): Promise<SessionResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = refresh().finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

/**
 * The one function every API call in the app goes through. On a 401 from
 * an auth-required call it spends the refresh cookie exactly once
 * (multiple simultaneous callers share the same in-flight refresh) and
 * retries the original request; a second 401 means the session is truly
 * gone and the app is told to show the login screen.
 */
export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  let res = await rawFetch(path, opts)

  if (res.status === 401 && opts.auth !== false) {
    const refreshed = await refreshOnce()
    if (!refreshed) {
      clearSession()
      onSessionLost?.()
      const problem = await parseJSON<ProblemDTO>(res).catch(() => ({ code: 'UNAUTHENTICATED' }))
      throw new ApiError(problem, 401)
    }
    res = await rawFetch(path, opts)
  }

  if (!res.ok) {
    const problem = await parseJSON<ProblemDTO>(res).catch(() => ({ code: 'UNKNOWN_ERROR' }))
    throw new ApiError(problem, res.status)
  }
  return parseJSON<T>(res)
}

export async function login(email: string, password: string): Promise<SessionResponse> {
  const res = await rawFetch('/api/v1/auth/login', { method: 'POST', auth: false, body: { email, password } })
  if (!res.ok) {
    const problem = await parseJSON<ProblemDTO>(res).catch(() => ({ code: 'UNKNOWN_ERROR' }))
    throw new ApiError(problem, res.status)
  }
  const data = await parseJSON<SessionResponse>(res)
  setSession(data)
  return data
}

export interface RegisterInput {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  home_location_code: string
  plan_code: string
  locale: 'el' | 'en'
}

export async function register(input: RegisterInput): Promise<SessionResponse> {
  const res = await rawFetch('/api/v1/auth/register', { method: 'POST', auth: false, body: input })
  if (!res.ok) {
    const problem = await parseJSON<ProblemDTO>(res).catch(() => ({ code: 'UNKNOWN_ERROR' }))
    throw new ApiError(problem, res.status)
  }
  const data = await parseJSON<SessionResponse>(res)
  setSession(data)
  return data
}

export async function logout(): Promise<void> {
  await rawFetch('/api/v1/auth/logout', { method: 'POST', auth: false }).catch(() => {})
  clearSession()
}

/** Called once on app boot: try to mint a session from the refresh cookie. */
export async function bootSession(): Promise<SessionResponse | null> {
  return refreshOnce()
}
