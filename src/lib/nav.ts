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
import type { TranslationKey } from '@/context/LanguageContext'

export interface NavItem {
  path: string
  /** A translation key, not literal text — the label is looked up with `t()` at render time so it follows the active language. */
  labelKey: TranslationKey
  icon: LucideIcon
  /** key into GymData used to show a small count badge, e.g. unread notifications */
  badgeKey?: 'notifications'
}

// "/" is deliberately first, both here and as the post-login landing route
// (see App.tsx) — checking in is the one thing almost every member opens
// the app to do, so it's the very first screen, not a nav item several
// taps deep.
export const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.checkIn', icon: QrCode },
  { path: '/home', labelKey: 'nav.home', icon: LayoutDashboard },
  { path: '/membership', labelKey: 'nav.membership', icon: BadgeCheck },
  { path: '/classes', labelKey: 'nav.classesGroups', icon: Dumbbell },
  { path: '/progress', labelKey: 'nav.progress', icon: Flame },
  { path: '/billing', labelKey: 'nav.billing', icon: CreditCard },
  { path: '/notifications', labelKey: 'nav.notifications', icon: Bell, badgeKey: 'notifications' },
  { path: '/profile', labelKey: 'nav.profile', icon: UserCircle },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings2 },
]

export interface MobileTabItem {
  path: string
  /** Short — this renders under a small icon in a thumb-width tab, not in a full-width nav row. */
  labelKey: TranslationKey
  icon: LucideIcon
  end?: boolean
}

/** The 4 primary destinations for the mobile bottom tab bar, plus a "More" button (handled separately — opens the full nav drawer) for everything else. */
export const MOBILE_TAB_ITEMS: MobileTabItem[] = [
  { path: '/', labelKey: 'nav.checkIn', icon: QrCode, end: true },
  { path: '/home', labelKey: 'nav.home', icon: LayoutDashboard, end: true },
  { path: '/classes', labelKey: 'nav.classesShort', icon: Dumbbell },
  { path: '/progress', labelKey: 'nav.progress', icon: Flame },
]
