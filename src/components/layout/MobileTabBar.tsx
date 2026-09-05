import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { MOBILE_TAB_ITEMS } from '@/lib/nav'
import { useLanguage } from '@/context/LanguageContext'

interface MobileTabBarProps {
  onMore: () => void
  moreOpen: boolean
}

/**
 * The client app's primary mobile navigation — almost every member opens
 * this app on their phone (see the "More" drawer for everything else, and
 * Sidebar for the full nav on wider screens). Fixed to the bottom, large
 * thumb-friendly tap targets, safe-area aware for phones with a home
 * indicator.
 */
export function MobileTabBar({ onMore, moreOpen }: MobileTabBarProps) {
  const { t } = useLanguage()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {MOBILE_TAB_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[.03em] transition-colors ${
              isActive ? 'text-volt' : 'text-mute active:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {t(item.labelKey)}
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        aria-label={t('nav.more')}
        aria-pressed={moreOpen}
        className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[.03em] transition-colors ${
          moreOpen ? 'text-volt' : 'text-mute active:text-ink'
        }`}
      >
        <Menu className="h-5 w-5" strokeWidth={moreOpen ? 2.5 : 2} />
        {t('nav.more')}
      </button>
    </nav>
  )
}
