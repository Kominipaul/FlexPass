import { BarChart3, CalendarDays, ScanLine, Users, type LucideIcon } from 'lucide-react'

export interface AdminNavItem {
  path: string
  label: string
  hint: string
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { path: '/admin', label: 'Front Desk', hint: 'Scan & verify', icon: ScanLine },
  { path: '/admin/members', label: 'Members', hint: 'All locations', icon: Users },
  { path: '/admin/classes', label: 'Classes', hint: 'Capacity', icon: CalendarDays },
  { path: '/admin/insights', label: 'Insights', hint: 'Live', icon: BarChart3 },
]

export function adminPageTitle(pathname: string): string {
  const exact = ADMIN_NAV_ITEMS.find((item) => item.path === pathname)
  return exact?.label ?? 'Front Desk'
}
