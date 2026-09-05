import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CalendarDays, Dumbbell, ScanLine, Smartphone } from 'lucide-react'
import { useLanguage, type TranslationKey } from '@/context/LanguageContext'

const HIGHLIGHTS: { icon: typeof ScanLine; textKey: TranslationKey }[] = [
  { icon: ScanLine, textKey: 'authShared.staffHighlight1' },
  { icon: CalendarDays, textKey: 'authShared.staffHighlight2' },
  { icon: BarChart3, textKey: 'authShared.staffHighlight3' },
]

export function AdminAuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title: string
  subtitle?: string
}) {
  const { t } = useLanguage()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-bg p-10 text-ink lg:flex">
        <div className="hazard absolute inset-x-0 top-0 h-1 opacity-90" />
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, rgba(216,255,51,0.10), transparent 45%), radial-gradient(circle at 85% 75%, rgba(255,106,31,0.10), transparent 45%)',
          }}
        />
        <Link to="/admin/login" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-volt text-voltink">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="leading-none">
            <span className="font-display block text-lg font-extrabold uppercase tracking-[.04em]">FlexPass</span>
            <span className="mt-1 block text-[10px] text-mute">{t('adminNav.staffDashboard')}</span>
          </div>
        </Link>

        <div className="relative">
          <h2 className="font-display max-w-md text-3xl font-extrabold leading-tight">
            {t('authShared.staffTagline')}
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.textKey} className="flex items-center gap-3 text-dim">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-line bg-raised">
                  <h.icon className="h-4 w-4 text-volt" />
                </span>
                <span className="text-[13px]">{t(h.textKey)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <p className="text-[11px] text-mute">{t('authShared.staffDemoBlurb')}</p>
          <Link
            to="/login"
            className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-mute transition-colors hover:text-volt"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t('authShared.memberSignIn')}
          </Link>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-bg px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/admin/login" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-volt text-voltink">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold uppercase tracking-[.04em] text-ink">
              FlexPass Staff
            </span>
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] text-dim">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <Link
            to="/login"
            className="mt-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-mute transition-colors hover:text-volt lg:hidden"
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t('authShared.memberSignIn')}
          </Link>
        </div>
      </div>
    </div>
  )
}
