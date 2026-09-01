import { NavLink } from 'react-router-dom'
import { Dumbbell, LogOut, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { Avatar } from '@/components/ui/Avatar'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth()
  const { unreadNotificationCount, currentPlan } = useGymData()

  if (!user) return null

  const content = (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-volt text-voltink">
            <Dumbbell className="h-4 w-4" />
          </span>
          <div className="leading-none">
            <p className="font-display text-[13px] font-extrabold uppercase tracking-[.04em] text-ink">
              FlexPass
            </p>
            <p className="mt-1 text-[10px] text-mute">Member Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-[6px] p-1.5 text-mute hover:bg-raised hover:text-ink lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const badgeCount = item.badgeKey === 'notifications' ? unreadNotificationCount : 0
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `relative flex items-center justify-between rounded-[6px] px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                  isActive ? 'bg-voltsoft text-volt' : 'text-dim hover:bg-raised hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-volt" />}
                  <span className="flex items-center gap-3">
                    <item.icon className="h-[17px] w-[17px]" />
                    {item.label}
                  </span>
                  {badgeCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-volt px-1.5 text-[10.5px] font-bold text-voltink">
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-linesoft p-3">
        <div className="flex items-center gap-3 rounded-[9px] border border-line bg-raised p-2.5">
          <Avatar name={user.name} tone={user.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-mute">{currentPlan?.name ?? '—'} plan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-[12.5px] font-medium text-dim transition-colors hover:bg-raised hover:text-ink"
        >
          <LogOut className="h-[17px] w-[17px]" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="a-fade absolute inset-0 bg-black/70" onClick={onCloseMobile} aria-hidden="true" />
          <div className="a-rise absolute inset-y-0 left-0 w-72 max-w-[80vw]">{content}</div>
        </div>
      )}
    </>
  )
}
