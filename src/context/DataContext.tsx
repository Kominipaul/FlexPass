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
  AppNotification,
  CheckIn,
  ClassBooking,
  FreezeRecord,
  GroupMembership,
  Invoice,
  Location,
  Membership,
  PaymentMethod,
  Plan,
  TrainingGoal,
} from '@/types'
import * as db from '@/lib/db'
import { pinAllowanceFrom, type PinAllowance } from '@/lib/pinPolicy'
import { useAuth } from './AuthContext'

interface GymDataState {
  loading: boolean
  plans: Plan[]
  locations: Location[]
  activities: Activity[]
  membership: Membership | null
  classBookings: ClassBooking[]
  groupMemberships: GroupMembership[]
  checkIns: CheckIn[]
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  notifications: AppNotification[]
  trainingGoal: TrainingGoal | null
}

const EMPTY_STATE: GymDataState = {
  loading: true,
  plans: [],
  locations: [],
  activities: [],
  membership: null,
  classBookings: [],
  groupMemberships: [],
  checkIns: [],
  invoices: [],
  paymentMethods: [],
  notifications: [],
  trainingGoal: null,
}

interface GymDataContextValue extends GymDataState {
  currentPlan: Plan | undefined
  /** The club the member belongs to — its opening days drive the progression system. */
  homeLocation: Location | null
  /** Backup-PIN entries left this month, derived from the member's own check-ins. */
  pinAllowance: PinAllowance
  unreadNotificationCount: number
  refresh: () => Promise<void>
  // Plan changes and reactivation are staff-only for now — no online payment
  // provider exists to actually charge a member for either. See MembershipPage.
  setAutoRenew: (autoRenew: boolean) => Promise<void>
  freezeMembership: (record: Omit<FreezeRecord, 'id'>) => Promise<void>
  unfreezeMembership: () => Promise<void>
  cancelMembership: (immediate: boolean) => Promise<void>
  bookClass: (activityId: string, date: string) => Promise<ClassBooking>
  cancelBooking: (bookingId: string) => Promise<void>
  joinGroup: (activityId: string) => Promise<void>
  leaveGroup: (membershipId: string) => Promise<void>
  setTrainingGoal: (patch: Partial<Omit<TrainingGoal, 'userId'>>) => Promise<void>
  addPaymentMethod: (input: db.AddPaymentMethodInput) => Promise<void>
  removePaymentMethod: (id: string) => Promise<void>
  setDefaultPaymentMethod: (id: string) => Promise<void>
  payInvoice: (id: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAllNotifications: () => Promise<void>
}

const GymDataContext = createContext<GymDataContextValue | undefined>(undefined)

export function GymDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<GymDataState>(EMPTY_STATE)
  // Reference data is session-scoped; see refresh().
  const loadedReference = useRef(false)

  const refresh = useCallback(async () => {
    if (!user) {
      loadedReference.current = false
      setState(EMPTY_STATE)
      return
    }
    // Reference data (plans, locations, timetable) is the same for everyone
    // and changes only when staff edit it, so it is fetched once per session
    // rather than after every button press.
    const needsReference = !loadedReference.current
    const [
      membership,
      classBookings,
      groupMemberships,
      checkIns,
      invoices,
      paymentMethods,
      notifications,
      trainingGoal,
      reference,
    ] = await Promise.all([
      db.getMembership(),
      db.listClassBookings(),
      db.listGroupMemberships(),
      db.listCheckIns(),
      db.listInvoices(),
      db.listPaymentMethods(),
      db.listNotifications(),
      db.getTrainingGoal(),
      needsReference
        ? Promise.all([db.listPlans(), db.listLocations(), db.listActivities()])
        : Promise.resolve(null),
    ])
    if (reference) loadedReference.current = true

    setState((prev) => ({
      loading: false,
      plans: reference ? reference[0] : prev.plans,
      locations: reference ? reference[1] : prev.locations,
      activities: reference ? reference[2] : prev.activities,
      membership: membership ?? null,
      classBookings,
      groupMemberships,
      checkIns,
      invoices,
      paymentMethods,
      notifications,
      trainingGoal,
    }))
  }, [user])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Every mutation below follows the same shape: call the API, then reload
  // state from it. The per-member data set is small, so a
  // full refresh after each write is cheap and keeps every screen that
  // reads from this context trivially consistent — no hand-patched state.
  const setAutoRenew = useCallback(
    async (autoRenew: boolean) => {
      await db.setAutoRenew(autoRenew)
      await refresh()
    },
    [refresh],
  )

  const freezeMembership = useCallback(
    async (record: Omit<FreezeRecord, 'id'>) => {
      // The server owns the arithmetic — it decides the end date and how far
      // the renewal date moves, so a client clock can't buy free days.
      const days = Math.max(
        1,
        Math.round(
          (new Date(record.endDate).getTime() - new Date(record.startDate).getTime()) / 86400000,
        ),
      )
      await db.freezeMembership(days, record.reason)
      await refresh()
    },
    [refresh],
  )

  const unfreezeMembership = useCallback(async () => {
    await db.unfreezeMembership()
    await refresh()
  }, [refresh])

  const cancelMembership = useCallback(
    async (immediate: boolean) => {
      await db.cancelMembership(immediate)
      await refresh()
    },
    [refresh],
  )

  const bookClass = useCallback(
    async (activityId: string, date: string) => {
      const booking = await db.bookClass(activityId, date)
      await refresh()
      return booking
    },
    [refresh],
  )

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await db.cancelBooking(bookingId)
      await refresh()
    },
    [refresh],
  )

  const joinGroup = useCallback(
    async (activityId: string) => {
      await db.joinGroup(activityId)
      await refresh()
    },
    [refresh],
  )

  const leaveGroup = useCallback(
    async (membershipId: string) => {
      await db.leaveGroup(membershipId)
      await refresh()
    },
    [refresh],
  )

  const setTrainingGoal = useCallback(
    async (patch: Partial<Omit<TrainingGoal, 'userId'>>) => {
      const current = state.trainingGoal
      const next = await db.saveTrainingGoal(
        patch.daysPerWeek ?? current?.daysPerWeek ?? 3,
        patch.restDays ?? current?.restDays ?? [],
        patch.enabled ?? current?.enabled ?? true,
      )
      setState((prev) => ({ ...prev, trainingGoal: next }))
    },
    [state.trainingGoal],
  )

  const addPaymentMethod = useCallback(
    async (input: db.AddPaymentMethodInput) => {
      await db.addPaymentMethod(input)
      await refresh()
    },
    [refresh],
  )

  const removePaymentMethod = useCallback(
    async (id: string) => {
      await db.removePaymentMethod(id)
      await refresh()
    },
    [refresh],
  )

  const setDefaultPaymentMethod = useCallback(
    async (id: string) => {
      await db.setDefaultPaymentMethod(id)
      await refresh()
    },
    [refresh],
  )

  const payInvoice = useCallback(
    async (id: string) => {
      await db.payInvoice(id)
      await refresh()
    },
    [refresh],
  )

  const markNotificationRead = useCallback(
    async (id: string) => {
      await db.markNotificationRead(id)
      await refresh()
    },
    [refresh],
  )

  const markAllNotificationsRead = useCallback(async () => {
    await db.markAllNotificationsRead()
    await refresh()
  }, [refresh])

  const deleteNotification = useCallback(
    async (id: string) => {
      await db.deleteNotification(id)
      await refresh()
    },
    [refresh],
  )

  const clearAllNotifications = useCallback(async () => {
    await db.clearAllNotifications()
    await refresh()
  }, [refresh])

  const currentPlan = useMemo(
    () => state.plans.find((p) => p.id === state.membership?.planId),
    [state.plans, state.membership],
  )

  const homeLocation = useMemo(
    () => state.locations.find((l) => l.name === state.membership?.homeLocation) ?? null,
    [state.locations, state.membership],
  )

  const pinAllowance = useMemo(() => pinAllowanceFrom(state.checkIns), [state.checkIns])

  const unreadNotificationCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  )

  const value = useMemo<GymDataContextValue>(
    () => ({
      ...state,
      currentPlan,
      homeLocation,
      pinAllowance,
      unreadNotificationCount,
      refresh,
      setAutoRenew,
      freezeMembership,
      unfreezeMembership,
      cancelMembership,
      bookClass,
      cancelBooking,
      joinGroup,
      leaveGroup,
      setTrainingGoal,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      payInvoice,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearAllNotifications,
    }),
    [
      state,
      currentPlan,
      homeLocation,
      pinAllowance,
      unreadNotificationCount,
      refresh,
      setAutoRenew,
      freezeMembership,
      unfreezeMembership,
      cancelMembership,
      bookClass,
      cancelBooking,
      joinGroup,
      leaveGroup,
      setTrainingGoal,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      payInvoice,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearAllNotifications,
    ],
  )

  return <GymDataContext.Provider value={value}>{children}</GymDataContext.Provider>
}

export function useGymData(): GymDataContextValue {
  const ctx = useContext(GymDataContext)
  if (!ctx) throw new Error('useGymData must be used within a GymDataProvider')
  return ctx
}
