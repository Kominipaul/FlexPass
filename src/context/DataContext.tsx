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
  AppNotification,
  BillingCycle,
  CheckIn,
  CheckInMethod,
  ClassBooking,
  FreezeRecord,
  GroupMembership,
  Invoice,
  Membership,
  PaymentMethod,
  Plan,
} from '@/types'
import * as db from '@/lib/db'
import { useAuth } from './AuthContext'

interface GymDataState {
  loading: boolean
  plans: Plan[]
  activities: Activity[]
  membership: Membership | null
  classBookings: ClassBooking[]
  groupMemberships: GroupMembership[]
  checkIns: CheckIn[]
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  notifications: AppNotification[]
}

const EMPTY_STATE: GymDataState = {
  loading: true,
  plans: [],
  activities: [],
  membership: null,
  classBookings: [],
  groupMemberships: [],
  checkIns: [],
  invoices: [],
  paymentMethods: [],
  notifications: [],
}

interface GymDataContextValue extends GymDataState {
  currentPlan: Plan | undefined
  unreadNotificationCount: number
  refresh: () => Promise<void>
  upgradePlan: (planId: string, billingCycle: BillingCycle) => Promise<void>
  setAutoRenew: (autoRenew: boolean) => Promise<void>
  freezeMembership: (record: Omit<FreezeRecord, 'id'>) => Promise<void>
  unfreezeMembership: () => Promise<void>
  cancelMembership: (immediate: boolean) => Promise<void>
  reactivateMembership: () => Promise<void>
  bookClass: (activityId: string, date: string) => Promise<ClassBooking>
  cancelBooking: (bookingId: string) => Promise<void>
  joinGroup: (activityId: string) => Promise<void>
  leaveGroup: (membershipId: string) => Promise<void>
  checkIn: (method: CheckInMethod, location: string) => Promise<void>
  addPaymentMethod: (input: db.AddPaymentMethodInput) => Promise<void>
  removePaymentMethod: (id: string) => Promise<void>
  setDefaultPaymentMethod: (id: string) => Promise<void>
  payInvoice: (id: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const GymDataContext = createContext<GymDataContextValue | undefined>(undefined)

export function GymDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<GymDataState>(EMPTY_STATE)

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY_STATE)
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    const [
      plans,
      activities,
      membership,
      classBookings,
      groupMemberships,
      checkIns,
      invoices,
      paymentMethods,
      notifications,
    ] = await Promise.all([
      db.listPlans(),
      db.listActivities(),
      db.getMembership(user.id),
      db.listClassBookings(user.id),
      db.listGroupMemberships(user.id),
      db.listCheckIns(user.id),
      db.listInvoices(user.id),
      db.listPaymentMethods(user.id),
      db.listNotifications(user.id),
    ])
    setState({
      loading: false,
      plans,
      activities,
      membership: membership ?? null,
      classBookings,
      groupMemberships,
      checkIns,
      invoices,
      paymentMethods,
      notifications,
    })
  }, [user])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const requireUserId = useCallback((): string => {
    if (!user) throw new Error('Not signed in.')
    return user.id
  }, [user])

  // Every mutation below follows the same shape: call the mock API, then
  // reload state from it. The data set is tiny (localStorage-backed), so a
  // full refresh after each write is cheap and keeps every screen that
  // reads from this context trivially consistent — no hand-patched state.
  const upgradePlan = useCallback(
    async (planId: string, billingCycle: BillingCycle) => {
      await db.upgradePlan(requireUserId(), planId, billingCycle)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const setAutoRenew = useCallback(
    async (autoRenew: boolean) => {
      await db.setAutoRenew(requireUserId(), autoRenew)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const freezeMembership = useCallback(
    async (record: Omit<FreezeRecord, 'id'>) => {
      await db.freezeMembership(requireUserId(), record)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const unfreezeMembership = useCallback(async () => {
    await db.unfreezeMembership(requireUserId())
    await refresh()
  }, [requireUserId, refresh])

  const cancelMembership = useCallback(
    async (immediate: boolean) => {
      await db.cancelMembership(requireUserId(), immediate)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const reactivateMembership = useCallback(async () => {
    await db.reactivateMembership(requireUserId())
    await refresh()
  }, [requireUserId, refresh])

  const bookClass = useCallback(
    async (activityId: string, date: string) => {
      const booking = await db.bookClass(requireUserId(), activityId, date)
      await refresh()
      return booking
    },
    [requireUserId, refresh],
  )

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      await db.cancelBooking(bookingId, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const joinGroup = useCallback(
    async (activityId: string) => {
      await db.joinGroup(requireUserId(), activityId)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const leaveGroup = useCallback(
    async (membershipId: string) => {
      await db.leaveGroup(membershipId, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const checkIn = useCallback(
    async (method: CheckInMethod, location: string) => {
      await db.checkIn(requireUserId(), method, location)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const addPaymentMethod = useCallback(
    async (input: db.AddPaymentMethodInput) => {
      await db.addPaymentMethod(requireUserId(), input)
      await refresh()
    },
    [requireUserId, refresh],
  )

  const removePaymentMethod = useCallback(
    async (id: string) => {
      await db.removePaymentMethod(id, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const setDefaultPaymentMethod = useCallback(
    async (id: string) => {
      await db.setDefaultPaymentMethod(id, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const payInvoice = useCallback(
    async (id: string) => {
      await db.payInvoice(id, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const markNotificationRead = useCallback(
    async (id: string) => {
      await db.markNotificationRead(id, requireUserId())
      await refresh()
    },
    [requireUserId, refresh],
  )

  const markAllNotificationsRead = useCallback(async () => {
    await db.markAllNotificationsRead(requireUserId())
    await refresh()
  }, [requireUserId, refresh])

  const currentPlan = useMemo(
    () => state.plans.find((p) => p.id === state.membership?.planId),
    [state.plans, state.membership],
  )

  const unreadNotificationCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  )

  const value = useMemo<GymDataContextValue>(
    () => ({
      ...state,
      currentPlan,
      unreadNotificationCount,
      refresh,
      upgradePlan,
      setAutoRenew,
      freezeMembership,
      unfreezeMembership,
      cancelMembership,
      reactivateMembership,
      bookClass,
      cancelBooking,
      joinGroup,
      leaveGroup,
      checkIn,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      payInvoice,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      state,
      currentPlan,
      unreadNotificationCount,
      refresh,
      upgradePlan,
      setAutoRenew,
      freezeMembership,
      unfreezeMembership,
      cancelMembership,
      reactivateMembership,
      bookClass,
      cancelBooking,
      joinGroup,
      leaveGroup,
      checkIn,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      payInvoice,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  )

  return <GymDataContext.Provider value={value}>{children}</GymDataContext.Provider>
}

export function useGymData(): GymDataContextValue {
  const ctx = useContext(GymDataContext)
  if (!ctx) throw new Error('useGymData must be used within a GymDataProvider')
  return ctx
}
