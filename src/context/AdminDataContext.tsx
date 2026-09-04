import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  Activity,
  CheckIn,
  ClassBooking,
  DoorScan,
  GroupMembership,
  Location,
  PinUnlock,
  Plan,
} from '@/types'
import * as db from '@/lib/db'
import type { AdminMemberRow, NewActivityInput } from '@/lib/db'
import { useStaffAuth } from './StaffAuthContext'

interface AdminDataState {
  loading: boolean
  locations: Location[]
  plans: Plan[]
  activities: Activity[]
  members: AdminMemberRow[]
  checkIns: CheckIn[]
  classBookings: ClassBooking[]
  groupMemberships: GroupMembership[]
  doorScans: DoorScan[]
  pinUnlocks: PinUnlock[]
}

const EMPTY_STATE: AdminDataState = {
  loading: true,
  locations: [],
  plans: [],
  activities: [],
  members: [],
  checkIns: [],
  classBookings: [],
  groupMemberships: [],
  doorScans: [],
  pinUnlocks: [],
}

interface AdminDataContextValue extends AdminDataState {
  atLocationId: string
  setAtLocationId: (id: string) => void
  refresh: () => Promise<void>
  extendMembership: (userId: string, days: number) => Promise<void>
  setFrozen: (userId: string, frozen: boolean) => Promise<void>
  /** Real path: verifies the scanned QR token's signature before evaluating access. */
  recordScanByToken: (token: string, locationId: string) => ReturnType<typeof db.adminRecordScanByToken>
  /** Backup path, step 1: staff name the member, which is what makes the keypad appear at all. */
  openPinUnlock: (userId: string, override?: boolean) => Promise<PinUnlock>
  /** Backup path, step 2: one try at the named member's PIN. */
  attemptPinUnlock: (unlockId: string, pin: string) => ReturnType<typeof db.adminAttemptPinUnlock>
  cancelPinUnlock: (unlockId: string) => Promise<void>
  createActivity: (input: NewActivityInput) => Promise<void>
  deleteActivity: (activityId: string) => Promise<number>
}

/** Minimum gap between focus-triggered refreshes. */
const FOCUS_REFRESH_MS = 15_000

const AdminDataContext = createContext<AdminDataContextValue | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const { staff } = useStaffAuth()
  const [state, setState] = useState<AdminDataState>(EMPTY_STATE)
  const loadedReference = useRef(false)
  const [atLocationId, setAtLocationId] = useState('downtown')

  const refresh = useCallback(async () => {
    if (!staff) {
      loadedReference.current = false
      setState(EMPTY_STATE)
      return
    }
    const needsReference = !loadedReference.current
    const [
      members,
      checkIns,
      classBookings,
      groupMemberships,
      doorScans,
      pinUnlocks,
      reference,
    ] = await Promise.all([
      db.adminListMembers(),
      db.adminListAllCheckIns(),
      db.adminListAllClassBookings(),
      db.adminListAllGroupMemberships(),
      db.adminListDoorScans(),
      db.adminListPinUnlocks(),
      needsReference
        ? Promise.all([db.listLocations(), db.listPlans(), db.listActivities()])
        : Promise.resolve(null),
    ])
    if (reference) loadedReference.current = true

    // No `loading: true` on the way in: a refresh after a scan must not blank
    // the reader mid-queue.
    setState((prev) => ({
      loading: false,
      locations: reference ? reference[0] : prev.locations,
      plans: reference ? reference[1] : prev.plans,
      activities: reference ? reference[2] : prev.activities,
      members,
      checkIns,
      classBookings,
      groupMemberships,
      doorScans,
      pinUnlocks,
    }))
  }, [staff])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id])

  // A member who joined on another device is already in the database; the
  // desk just needs to re-read it. Refreshing on focus covers that without
  // polling — but throttled, because a refresh is nine requests and tab
  // focus fires far more often than the roster actually changes.
  useEffect(() => {
    if (!staff) return
    let lastRun = Date.now()
    const onFocus = () => {
      if (Date.now() - lastRun < FOCUS_REFRESH_MS) return
      lastRun = Date.now()
      refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [staff, refresh])

  const extendMembership = useCallback(
    async (userId: string, days: number) => {
      await db.adminExtendMembership(userId, days)
      await refresh()
    },
    [refresh],
  )

  const setFrozen = useCallback(
    async (userId: string, frozen: boolean) => {
      await db.adminSetFrozen(userId, frozen)
      await refresh()
    },
    [refresh],
  )

  const recordScanByToken = useCallback(
    async (token: string, locationId: string) => {
      const result = await db.adminRecordScanByToken(token, locationId)
      await refresh()
      return result
    },
    [refresh],
  )

  const openPinUnlock = useCallback(
    async (userId: string, override = false) => {
      if (!staff) throw new Error('Not signed in.')
      const unlock = await db.adminOpenPinUnlock(userId, atLocationId, override)
      await refresh()
      return unlock
    },
    [staff, atLocationId, refresh],
  )

  const attemptPinUnlock = useCallback(
    async (unlockId: string, pin: string) => {
      const result = await db.adminAttemptPinUnlock(unlockId, pin)
      await refresh()
      return result
    },
    [refresh],
  )

  const cancelPinUnlock = useCallback(
    async (unlockId: string) => {
      await db.adminCancelPinUnlock(unlockId)
      await refresh()
    },
    [refresh],
  )

  const createActivity = useCallback(
    async (input: NewActivityInput) => {
      await db.adminCreateActivity(input)
      await refresh()
    },
    [refresh],
  )

  const deleteActivity = useCallback(
    async (activityId: string) => {
      const { notified } = await db.adminDeleteActivity(activityId)
      await refresh()
      return notified
    },
    [refresh],
  )

  const value = useMemo<AdminDataContextValue>(
    () => ({
      ...state,
      atLocationId,
      setAtLocationId,
      refresh,
      extendMembership,
      setFrozen,
      recordScanByToken,
      openPinUnlock,
      attemptPinUnlock,
      cancelPinUnlock,
      createActivity,
      deleteActivity,
    }),
    [
      state,
      atLocationId,
      refresh,
      extendMembership,
      setFrozen,
      recordScanByToken,
      openPinUnlock,
      attemptPinUnlock,
      cancelPinUnlock,
      createActivity,
      deleteActivity,
    ],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider')
  return ctx
}
