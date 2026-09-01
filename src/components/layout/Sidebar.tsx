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
    <div className="flex h-full flex-col bg-ink-950 text-slate-300">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">FlexPass</p>
            <p className="text-[11px] text-slate-500">Member Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const badgeCount = item.badgeKey === 'notifications' ? unreadNotificationCount : 0
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </span>
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime-400 px-1.5 text-[11px] font-bold text-ink-950">
                  {badgeCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar name={user.name} tone={user.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{currentPlan?.name ?? '—'} plan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={onCloseMobile} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] animate-slide-in">{content}</div>
        </div>
      )}
    </>
  )
}
