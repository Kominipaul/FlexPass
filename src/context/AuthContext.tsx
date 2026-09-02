import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PendingAuth, User } from '@/types'
import * as db from '@/lib/db'
import { clearSession, loadSession, saveSession } from '@/lib/session'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  pendingAuth: PendingAuth | null
  login: (email: string, password: string, remember: boolean) => Promise<{ requiresCode: boolean }>
  verifyCode: (code: string) => Promise<void>
  resendCode: () => void
  cancelPendingAuth: () => void
  signup: (input: db.SignupInput) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateProfile: (patch: db.ProfileUpdate) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  setTwoFactorEnabled: (enabled: boolean) => Promise<void>
  regenerateCheckInPin: () => Promise<string>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const CODE_TTL_MS = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null)

  useEffect(() => {
    const existingId = loadSession()
    if (!existingId) {
      setStatus('unauthenticated')
      return
    }
    db.getUser(existingId).then((found) => {
      if (found) {
        setUser(found)
        setStatus('authenticated')
      } else {
        clearSession()
        setStatus('unauthenticated')
      }
    })
  }, [])

  const completeLogin = useCallback((loggedInUser: User, remember: boolean) => {
    saveSession(loggedInUser.id, remember)
    setUser(loggedInUser)
    setPendingAuth(null)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const found = await db.findUserByEmail(email)
      if (!found) throw new Error('No account matches that email address.')
      const ok = await db.verifyPassword(found, password)
      if (!ok) throw new Error('Incorrect password. Please try again.')

      if (found.security.twoFactorEnabled) {
        const code = db.generateLoginCode()
        setPendingAuth({
          userId: found.id,
          email: found.email,
          code,
          expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
          remember,
        })
        return { requiresCode: true }
      }

      completeLogin(found, remember)
      return { requiresCode: false }
    },
    [completeLogin],
  )

  const verifyCode = useCallback(
    async (code: string) => {
      if (!pendingAuth) throw new Error('Your sign-in session expired. Please log in again.')
      if (new Date(pendingAuth.expiresAt).getTime() < Date.now()) {
        setPendingAuth(null)
        throw new Error('That code expired. Please request a new one.')
      }
      if (code.trim() !== pendingAuth.code) {
        throw new Error('That code is incorrect. Double-check and try again.')
      }
      const found = await db.getUser(pendingAuth.userId)
      if (!found) throw new Error('Account not found.')
      completeLogin(found, pendingAuth.remember)
    },
    [pendingAuth, completeLogin],
  )

  const resendCode = useCallback(() => {
    setPendingAuth((prev) =>
      prev
        ? { ...prev, code: db.generateLoginCode(), expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString() }
        : prev,
    )
  }, [])

  const cancelPendingAuth = useCallback(() => setPendingAuth(null), [])

  const signup = useCallback(
    async (input: db.SignupInput) => {
      const created = await db.signup(input)
      completeLogin(created, true)
    },
    [completeLogin],
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setPendingAuth(null)
    setStatus('unauthenticated')
  }, [])

  const refreshUser = useCallback(async () => {
    if (!user) return
    const fresh = await db.getUser(user.id)
    if (fresh) setUser(fresh)
  }, [user])

  const updateProfile = useCallback(
    async (patch: db.ProfileUpdate) => {
      if (!user) throw new Error('Not signed in.')
      const updated = await db.updateProfile(user.id, patch)
      setUser(updated)
    },
    [user],
  )

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!user) throw new Error('Not signed in.')
      await db.changePassword(user.id, current, next)
      await refreshUser()
    },
    [user, refreshUser],
  )

  const setTwoFactorEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user) throw new Error('Not signed in.')
      const updated = await db.setTwoFactorEnabled(user.id, enabled)
      setUser(updated)
    },
    [user],
  )

  const regenerateCheckInPin = useCallback(async () => {
    if (!user) throw new Error('Not signed in.')
    const pin = await db.regenerateCheckInPin(user.id)
    await refreshUser()
    return pin
  }, [user, refreshUser])

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Not signed in.')
    await db.deleteAccount(user.id)
    logout()
  }, [user, logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      pendingAuth,
      login,
      verifyCode,
      resendCode,
      cancelPendingAuth,
      signup,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
      setTwoFactorEnabled,
      regenerateCheckInPin,
      deleteAccount,
    }),
    [
      status,
      user,
      pendingAuth,
      login,
      verifyCode,
      resendCode,
      cancelPendingAuth,
      signup,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
      setTwoFactorEnabled,
      regenerateCheckInPin,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
