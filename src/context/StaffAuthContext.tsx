import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { StaffUser } from '@/types'
import * as db from '@/lib/db'

type StaffAuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/**
 * Front-desk session — a wholly separate identity from the member one, on
 * its own cookie. That separation is what lets one browser hold both at
 * once: the member app in one tab, the scanner in another.
 */
interface StaffAuthContextValue {
  status: StaffAuthStatus
  staff: StaffUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(undefined)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StaffAuthStatus>('loading')
  const [staff, setStaff] = useState<StaffUser | null>(null)

  useEffect(() => {
    let cancelled = false
    db.getCurrentStaff().then((found) => {
      if (cancelled) return
      setStaff(found)
      setStatus(found ? 'authenticated' : 'unauthenticated')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const found = await db.staffLogin(email, password, true)
    setStaff(found)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await db.staffLogout().catch(() => {})
    setStaff(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<StaffAuthContextValue>(
    () => ({ status, staff, login, logout }),
    [status, staff, login, logout],
  )

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext)
  if (!ctx) throw new Error('useStaffAuth must be used within a StaffAuthProvider')
  return ctx
}
