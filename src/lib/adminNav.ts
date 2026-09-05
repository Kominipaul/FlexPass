import { BarChart3, CalendarDays, ScanLine, Users, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from '@/context/LanguageContext'

export interface AdminNavItem {
  path: string
  /** Translation keys, looked up with `t()` at render time, not literal text. */
  labelKey: TranslationKey
  hintKey: TranslationKey
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { path: '/admin', labelKey: 'adminNav.frontDesk', hintKey: 'adminNav.frontDeskHint', icon: ScanLine },
  { path: '/admin/members', labelKey: 'adminNav.members', hintKey: 'adminNav.membersHint', icon: Users },
  { path: '/admin/classes', labelKey: 'adminNav.classes', hintKey: 'adminNav.classesHint', icon: CalendarDays },
  { path: '/admin/insights', labelKey: 'adminNav.insights', hintKey: 'adminNav.insightsHint', icon: BarChart3 },
]

export function adminPageTitleKey(pathname: string): TranslationKey {
  const exact = ADMIN_NAV_ITEMS.find((item) => item.path === pathname)
  return exact?.labelKey ?? 'adminNav.frontDesk'
}
