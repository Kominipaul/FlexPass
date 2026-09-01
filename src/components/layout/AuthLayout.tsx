import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Dumbbell, QrCode, TrendingUp } from 'lucide-react'

const HIGHLIGHTS = [
  { icon: QrCode, text: 'Tap in with your digital membership card' },
  { icon: CalendarCheck2, text: 'Book classes and join ongoing groups in seconds' },
  { icon: TrendingUp, text: 'Track visits, streaks, and plan renewal at a glance' },
]

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.5), transparent 45%), radial-gradient(circle at 80% 70%, rgba(163,230,53,0.35), transparent 40%)',
          }}
        />
        <Link to="/login" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">FlexPass</span>
        </Link>

        <div className="relative">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight">
            Your membership, plans and classes — all in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className="h-4 w-4 text-lime-300" />
                </span>
                <span className="text-sm">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          FlexPass member portal — client-side demo. Multi-location gym management, built with Go &amp;
          PostgreSQL on the backend.
        </p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/login" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink-900">FlexPass</span>
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
