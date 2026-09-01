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
import { clearStaffSession, loadStaffSession, saveStaffSession } from '@/lib/staffSession'

type StaffAuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface StaffAuthContextValue {
  status: StaffAuthStatus
  staff: StaffUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(undefined)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StaffAuthStatus>('loading')
  const [staff, setStaff] = useState<StaffUser | null>(null)

  useEffect(() => {
    const existingId = loadStaffSession()
    if (!existingId) {
      setStatus('unauthenticated')
      return
    }
    db.getStaffUser(existingId).then((found) => {
      if (found) {
        setStaff(found)
        setStatus('authenticated')
      } else {
        clearStaffSession()
        setStatus('unauthenticated')
      }
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const found = await db.findStaffByEmail(email)
    if (!found) throw new Error('No staff account matches that email address.')
    const ok = await db.verifyStaffPassword(found, password)
    if (!ok) throw new Error('Incorrect password. Please try again.')
    saveStaffSession(found.id)
    setStaff(found)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearStaffSession()
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
