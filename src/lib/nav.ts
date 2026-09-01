import {
  BadgeCheck,
  Bell,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
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

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/membership', label: 'Membership', icon: BadgeCheck },
  { path: '/classes', label: 'Classes & Groups', icon: Dumbbell },
  { path: '/check-ins', label: 'Check-ins', icon: ClipboardCheck },
  { path: '/card', label: 'Membership Card', icon: QrCode },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
  { path: '/profile', label: 'Profile', icon: UserCircle },
  { path: '/settings', label: 'Settings', icon: Settings2 },
]

export function pageTitleForPath(pathname: string): string {
  const exact = NAV_ITEMS.find((item) => item.path === pathname)
  if (exact) return exact.label
  if (pathname.startsWith('/membership/upgrade')) return 'Upgrade Plan'
  return 'FlexPass'
}
