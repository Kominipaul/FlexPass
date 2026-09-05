import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { storage } from '@/lib/storage'

/**
 * Kiosk mode locks a specific tablet, not a staff account.
 *
 * A phone or laptop a staffer carries around never needs this; a tablet
 * bolted to a stand by the turnstile does, because anyone waiting to check
 * in can reach it. The flag lives in this browser's localStorage rather
 * than in the staff session or the server, on purpose — it describes the
 * device sitting on the stand, and has to survive a reload and a change of
 * which staff member is signed in without either of those things being
 * able to touch it. Turning it on hides every admin route but the scanner
 * (AdminLayout); turning it back off requires the current staff member's
 * password (UnlockKioskDialog) so a member fiddling with the tablet can't
 * simply tap their way back into the member roster or the door log.
 */
interface KioskContextValue {
  kiosk: boolean
  lock: () => void
  setKiosk: (value: boolean) => void
}

const KioskContext = createContext<KioskContextValue | undefined>(undefined)

export function KioskProvider({ children }: { children: ReactNode }) {
  const [kiosk, setKioskState] = useState(() => storage.get('kioskMode', false))

  const setKiosk = useCallback((value: boolean) => {
    storage.set('kioskMode', value)
    setKioskState(value)
  }, [])

  const lock = useCallback(() => setKiosk(true), [setKiosk])

  const value = useMemo<KioskContextValue>(() => ({ kiosk, lock, setKiosk }), [kiosk, lock, setKiosk])

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>
}

export function useKiosk(): KioskContextValue {
  const ctx = useContext(KioskContext)
  if (!ctx) throw new Error('useKiosk must be used within a KioskProvider')
  return ctx
}
