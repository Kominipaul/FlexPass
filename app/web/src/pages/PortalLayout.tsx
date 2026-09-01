import { NavLink, Outlet } from 'react-router-dom'
import { QrCode as QrCodeIcon, CalendarDays, User, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useL } from '../lib/i18n'
import { Avatar } from '../components/primitives'

export function PortalLayout() {
  const { me, logout } = useAuth()
  const { t, lang, setLang } = useL()
  const member = me?.member
  if (!member) return null

  const tabs = [
    { to: '/', label: t('pass'), icon: QrCodeIcon, end: true },
    { to: '/classes', label: t('classes'), icon: CalendarDays, end: false },
    { to: '/account', label: t('account'), icon: User, end: false },
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 h-[57px] border-b border-line bg-surface flex items-center gap-3 px-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 rounded-[8px] bg-volt text-voltink grid place-items-center display text-[13px] font-extrabold tracking-tight">PL</span>
          <div className="leading-none">
            <p className="display text-[14px] font-extrabold uppercase tracking-[.06em]">Power Life <span className="text-volt">Gym</span></p>
            <p className="text-[10px] text-mute mt-1">{t('brandTag')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="inline-flex items-center rounded-[6px] border border-line bg-raised overflow-hidden">
            {(['el', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`display h-8 px-2.5 text-[11px] font-bold tracking-[.08em] transition-colors ${lang === l ? 'bg-volt text-voltink' : 'text-dim hover:text-ink'}`}>
                {l === 'el' ? 'ΕΛ' : 'EN'}
              </button>
            ))}
          </div>
          <button onClick={() => logout()} aria-label={t('logout')}
            className="w-8 h-8 grid place-items-center rounded-[6px] border border-line bg-raised text-dim hover:text-bad transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="relative plate min-h-[calc(100vh-57px)]">
        <div className="relative z-10 mx-auto w-full max-w-[580px] px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow text-mute">{t('memberPortal')}</p>
              <h1 className="display text-[18px] font-extrabold leading-tight mt-1">{t('greeting')}, {member.first_name}</h1>
            </div>
            <Avatar name={`${member.first_name} ${member.last_name}`} size={40} />
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-[9px] bg-raised border border-line mb-4 sticky top-[65px] z-20">
            {tabs.map((tb) => (
              <NavLink key={tb.to} to={tb.to} end={tb.end}
                className={({ isActive }) =>
                  `display h-9 rounded-[6px] text-[11.5px] font-bold uppercase tracking-[.06em] inline-flex items-center justify-center gap-1.5 transition-colors ${isActive ? 'bg-volt text-voltink' : 'text-dim hover:text-ink'}`
                }>
                <tb.icon size={14} />{tb.label}
              </NavLink>
            ))}
          </div>

          <div className="a-fade space-y-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
