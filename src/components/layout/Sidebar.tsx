import { useRef, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Dumbbell, LogOut } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useLanguage } from '@/context/LanguageContext'
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss'
import { Avatar } from '@/components/ui/Avatar'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile — mounted only while open, so the drag gesture lives and dies with it. */}
      {mobileOpen && <MobileNavDrawer onClose={onCloseMobile} />}
    </>
  )
}

/**
 * The "More" drawer. Like the sheets, it closes by being pushed away —
 * swipe it back toward the left edge it came from — as well as by the
 * backdrop or picking something from it.
 */
function MobileNavDrawer({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const { panelRef, dragging, closing, dismiss } = useSwipeDismiss({
    enabled: true,
    direction: 'left',
    onDismiss: onClose,
    backdropRef,
    threshold: 70,
  })

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] ${dragging || closing ? '' : 'a-fade'}`}
        onClick={dismiss}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[82vw] ${dragging || closing ? '' : 'a-slide-in-left'}`}
        style={{ willChange: dragging ? 'transform' : undefined }}
      >
        <SidebarContent onNavigate={dismiss} />
        {/* Grip: the visual promise that this edge is draggable. */}
        <span className="my-auto -ml-px h-16 w-1 shrink-0 rounded-full bg-line" aria-hidden="true" />
      </div>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth()
  const { unreadNotificationCount, currentPlan } = useGymData()
  const { t } = useLanguage()
  if (!user) return null

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-volt text-voltink">
          <Dumbbell className="h-4 w-4" />
        </span>
        <div className="leading-none">
          <p className="font-display text-[13px] font-extrabold uppercase tracking-[.04em] text-ink">FlexPass</p>
          <p className="mt-1 text-[10px] text-mute">{t('nav.memberPortal')}</p>
        </div>
      </div>

      <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const badgeCount = item.badgeKey === 'notifications' ? unreadNotificationCount : 0
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex items-center justify-between gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-voltsoft text-volt' : 'text-dim hover:bg-raised hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-volt" />}
                  <span className="flex min-w-0 items-center gap-3">
                    <item.icon className="h-[17px] w-[17px] shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </span>
                  {badgeCount > 0 && (
                    <NavBadge>{badgeCount}</NavBadge>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div
        className="border-t border-linesoft p-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 rounded-[9px] border border-line bg-raised p-2.5">
          <Avatar name={user.name} tone={user.avatarColor} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-mute">{t('nav.planSuffix', { plan: currentPlan?.name ?? '—' })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-dim transition-colors hover:bg-raised hover:text-ink"
        >
          <LogOut className="h-[17px] w-[17px]" />
          {t('nav.logOut')}
        </button>
      </div>
    </div>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-volt px-1.5 text-[10.5px] font-bold text-voltink">
      {children}
    </span>
  )
}
