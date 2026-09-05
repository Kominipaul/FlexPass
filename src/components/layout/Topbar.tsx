import { Link } from 'react-router-dom'
import { Bell, Dumbbell } from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Avatar } from '@/components/ui/Avatar'

// No mobile menu button here — on <lg the bottom MobileTabBar's "More" tab
// owns opening the nav drawer, so there's exactly one way to reach it
// instead of two identical buttons in different corners of the screen.
//
// And no page title either: every page states its own name in a PageHeader
// directly below this bar, so repeating it here just said the same word
// twice in two type styles. On mobile the space goes to the wordmark
// instead — the sidebar that normally carries it is hidden down there.
export function Topbar() {
  const { unreadNotificationCount } = useGymData()
  const { user } = useAuth()
  const { t } = useLanguage()

  if (!user) return null

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <Link to="/" className="flex items-center gap-2 lg:invisible" aria-label="FlexPass — check in">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-volt text-voltink">
          <Dumbbell className="h-3.5 w-3.5" />
        </span>
        <span className="font-display text-[14px] font-extrabold uppercase tracking-[.05em] text-ink">
          FlexPass
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/notifications"
          className="relative rounded-[7px] p-2 text-dim hover:bg-raised hover:text-ink"
          aria-label={t('nav.notifications')}
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bad ring-2 ring-surface" />
          )}
        </Link>
        <Link to="/profile" className="rounded-full" aria-label={t('nav.profileAria')}>
          <Avatar name={user.name} tone={user.avatarColor} size="sm" />
        </Link>
      </div>
    </header>
  )
}
