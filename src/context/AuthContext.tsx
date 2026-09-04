import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import * as db from '@/lib/db'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/**
 * Session state for the member app.
 *
 * The session itself is an HttpOnly cookie the API sets — this context never
 * sees a token and cannot forge one. On boot it simply asks the server who
 * it is talking to, which is also what makes a session survive a reload on
 * one device without leaking anything to another.
 *
 * Sign-in is email + password only: no SMS, no authenticator codes, no
 * verification step. `setTwoFactorEnabled` still stores the member's
 * preference so the Settings toggle keeps its meaning for later, but login
 * never branches on it.
 */
interface AuthContextValue {
  status: AuthStatus
  user: User | null
  login: (email: string, password: string, remember: boolean) => Promise<void>
  signup: (input: db.SignupInput) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (patch: db.ProfileUpdate) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  setTwoFactorEnabled: (enabled: boolean) => Promise<void>
  regenerateCheckInPin: () => Promise<string>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let cancelled = false
    db.getCurrentUser().then((found) => {
      if (cancelled) return
      setUser(found)
      setStatus(found ? 'authenticated' : 'unauthenticated')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const found = await db.login(email, password, remember)
    setUser(found)
    setStatus('authenticated')
  }, [])

  const signup = useCallback(async (input: db.SignupInput) => {
    const created = await db.signup(input)
    setUser(created)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await db.logout().catch(() => {})
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const refreshUser = useCallback(async () => {
    const fresh = await db.getCurrentUser()
    if (fresh) setUser(fresh)
  }, [])

  const updateProfile = useCallback(async (patch: db.ProfileUpdate) => {
    setUser(await db.updateProfile(patch))
  }, [])

  const changePassword = useCallback(
    async (current: string, next: string) => {
      await db.changePassword(current, next)
      await refreshUser()
    },
    [refreshUser],
  )

  const setTwoFactorEnabled = useCallback(async (enabled: boolean) => {
    setUser(await db.setTwoFactorEnabled(enabled))
  }, [])

  const regenerateCheckInPin = useCallback(async () => {
    const pin = await db.regenerateCheckInPin()
    await refreshUser()
    return pin
  }, [refreshUser])

  const deleteAccount = useCallback(async () => {
    await db.deleteAccount()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status, user, login, signup, logout, refreshUser, updateProfile,
      changePassword, setTwoFactorEnabled, regenerateCheckInPin, deleteAccount,
    }),
    [
      status, user, login, signup, logout, refreshUser, updateProfile,
      changePassword, setTwoFactorEnabled, regenerateCheckInPin, deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
