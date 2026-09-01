import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Activity,
  CheckIn,
  CheckInMethod,
  ClassBooking,
  DoorScan,
  GroupMembership,
  Location,
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
}

interface AdminDataContextValue extends AdminDataState {
  atLocationId: string
  setAtLocationId: (id: string) => void
  refresh: () => Promise<void>
  extendMembership: (userId: string, days: number) => Promise<void>
  setFrozen: (userId: string, frozen: boolean) => Promise<void>
  recordScan: (userId: string, locationId: string, method: CheckInMethod) => ReturnType<typeof db.adminRecordScan>
  createActivity: (input: NewActivityInput) => Promise<void>
  deleteActivity: (activityId: string) => Promise<number>
}

const AdminDataContext = createContext<AdminDataContextValue | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const { staff } = useStaffAuth()
  const [state, setState] = useState<AdminDataState>(EMPTY_STATE)
  const [atLocationId, setAtLocationId] = useState('downtown')

  const refresh = useCallback(async () => {
    if (!staff) {
      setState(EMPTY_STATE)
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    const [locations, plans, activities, members, checkIns, classBookings, groupMemberships, doorScans] =
      await Promise.all([
        db.listLocations(),
        db.listPlans(),
        db.listActivities(),
        db.adminListMembers(),
        db.adminListAllCheckIns(),
        db.adminListAllClassBookings(),
        db.adminListAllGroupMemberships(),
        db.adminListDoorScans(),
      ])
    setState({
      loading: false,
      locations,
      plans,
      activities,
      members,
      checkIns,
      classBookings,
      groupMemberships,
      doorScans,
    })
  }, [staff])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id])

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

  const recordScan = useCallback(
    async (userId: string, locationId: string, method: CheckInMethod) => {
      const result = await db.adminRecordScan(userId, locationId, method)
      await refresh()
      return result
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
      recordScan,
      createActivity,
      deleteActivity,
    }),
    [state, atLocationId, refresh, extendMembership, setFrozen, recordScan, createActivity, deleteActivity],
  )

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider')
  return ctx
}
