import { Link, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { pageTitleForPath } from '@/lib/nav'
import { useGymData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'

// No mobile menu button here — on <lg the bottom MobileTabBar's "More" tab
// owns opening the nav drawer, so there's exactly one way to reach it
// instead of two identical buttons in different corners of the screen.
export function Topbar() {
  const location = useLocation()
  const { unreadNotificationCount } = useGymData()
  const { user } = useAuth()

  if (!user) return null

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <h1 className="font-display text-[15px] font-bold uppercase tracking-[.03em] text-ink">
        {pageTitleForPath(location.pathname)}
      </h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/notifications"
          className="relative rounded-[7px] p-2 text-dim hover:bg-raised hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bad ring-2 ring-surface" />
          )}
        </Link>
        <Link to="/profile" className="rounded-full" aria-label="Your profile">
          <Avatar name={user.name} tone={user.avatarColor} size="sm" />
        </Link>
      </div>
    </header>
  )
}
