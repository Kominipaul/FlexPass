import {
  BadgeCheck,
  Bell,
  CreditCard,
  Dumbbell,
  Flame,
  LayoutDashboard,
  QrCode,
  Settings2,
  UserCircle,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** key into GymData used to show a small count badge, e.g. unread notifications */
  badgeKey?: 'notifications'
}

// "/" is deliberately first, both here and as the post-login landing route
// (see App.tsx) — checking in is the one thing almost every member opens
// the app to do, so it's the very first screen, not a nav item several
// taps deep.
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Check In', icon: QrCode },
  { path: '/home', label: 'Home', icon: LayoutDashboard },
  { path: '/membership', label: 'Membership', icon: BadgeCheck },
  { path: '/classes', label: 'Classes & Groups', icon: Dumbbell },
  { path: '/progress', label: 'Progress', icon: Flame },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
  { path: '/profile', label: 'Profile', icon: UserCircle },
  { path: '/settings', label: 'Settings', icon: Settings2 },
]

export interface MobileTabItem {
  path: string
  /** Short — this renders under a small icon in a thumb-width tab, not in a full-width nav row. */
  label: string
  icon: LucideIcon
  end?: boolean
}

/** The 4 primary destinations for the mobile bottom tab bar, plus a "More" button (handled separately — opens the full nav drawer) for everything else. */
export const MOBILE_TAB_ITEMS: MobileTabItem[] = [
  { path: '/', label: 'Check In', icon: QrCode, end: true },
  { path: '/home', label: 'Home', icon: LayoutDashboard, end: true },
  { path: '/classes', label: 'Classes', icon: Dumbbell },
  { path: '/progress', label: 'Progress', icon: Flame },
]
