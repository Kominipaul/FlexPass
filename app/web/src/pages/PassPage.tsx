import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ShieldCheck, ScanLine, Flame, CalendarCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useL } from '../lib/i18n'
import { getPass } from '../api/endpoints'
import { Card, StatusPill, statusFromMembership } from '../components/primitives'
import { QrCode } from '../components/QrCode'
import { Announcements } from '../components/Announcements'
import * as doorpass from '../lib/doorpass'

export function PassPage() {
  const { t, tx, lang } = useL()
  const { me } = useAuth()
  const member = me?.member
  const membership = member?.membership

  const passQuery = useQuery({
    queryKey: ['pass'],
    queryFn: getPass,
    staleTime: Infinity, // the secret doesn't change; refetch only on a fresh mount
  })

  const [payload, setPayload] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(doorpass.WINDOW_SECONDS)

  useEffect(() => {
    if (!passQuery.data) return
    const secret = doorpass.base64ToBytes(passQuery.data.door_secret_b64)
    const memberCode = passQuery.data.member_code

    let cancelled = false
    async function tick() {
      const now = Date.now()
      const window = doorpass.currentWindow(now)
      const tok = await doorpass.token(secret, window)
      if (cancelled) return
      setPayload(doorpass.encode(memberCode, tok))
      const msIntoWindow = now % (doorpass.WINDOW_SECONDS * 1000)
      setSecondsLeft(Math.ceil((doorpass.WINDOW_SECONDS * 1000 - msIntoWindow) / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [passQuery.data])

  // A slowly-changing display stat derived straight from joined_on. The
  // linter flags any Date.now() reached during render as impure (it can't
  // tell this case apart from one where a torn value would actually be
  // visible); routing it through an effect+setState instead would trade
  // that for a real extra render on every mount, which is worse. This is a
  // deliberate, reviewed exception, not an oversight.
  const monthsAsMember = member
    ? Math.floor((Date.now() - new Date(member.joined_on).getTime()) / (86_400_000 * 30))
    : 0

  if (!member || !membership) return null

  const status = statusFromMembership(membership.status, membership.days_left)
  const ring = 2 * Math.PI * 13
  const progress = ring * (1 - secondsLeft / doorpass.WINDOW_SECONDS)

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden relative">
        <div className="h-1 hazard opacity-90" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-volt">{t('doorPass')}</p>
              <h1 className="display text-[24px] leading-tight font-extrabold mt-1.5">
                {member.first_name} {member.last_name}
              </h1>
              <p className="mono text-[11px] text-mute mt-1">
                {member.member_code} · {t('memberSince')} {new Date(member.joined_on).getFullYear()}
              </p>
            </div>
            <StatusPill status={status} lang={lang} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-[9px] border border-line bg-raised px-3 py-2.5">
              <p className="eyebrow text-mute">{t('activeBranch')}</p>
              <p className="text-[12.5px] font-semibold mt-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-volt" />{tx(member.home_location.name)}
              </p>
            </div>
            <div className="rounded-[9px] border border-line bg-raised px-3 py-2.5">
              <p className="eyebrow text-mute">{t('membershipLabel')}</p>
              <p className="text-[12.5px] font-semibold mt-1 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-volt" />{tx(membership.plan.name)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div className="relative">
              <span className="absolute inset-0 rounded-[12px] border-2 border-volt a-ring" />
              <span className="absolute inset-0 rounded-[12px] border-2 border-volt a-ring" style={{ animationDelay: '1.2s' }} />
              <span className="relative block p-3 bg-white rounded-[12px] shadow-lift">
                {payload
                  ? <QrCode payload={payload} />
                  : <div className="w-[190px] h-[190px] grid place-items-center text-mute text-[12px]">{t('loading')}</div>}
              </span>
            </div>

            <p className="eyebrow text-mute mt-3.5 text-center">{t('accessPass')}</p>

            <div className="flex items-center gap-2.5 mt-2.5">
              <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90" aria-hidden="true">
                <circle cx="15" cy="15" r="13" fill="none" stroke="var(--grid)" strokeWidth="3" />
                <circle cx="15" cy="15" r="13" fill="none" stroke="var(--volt)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={ring} strokeDashoffset={progress} style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div>
                <p className="mono text-[12.5px] font-semibold tracking-[.1em] text-volt">
                  {payload?.split(':')[1] ?? '····-····-····-····'}
                </p>
                <p className="text-[11px] text-dim">{t('rotatesIn')} {secondsLeft}s · {t('tapRefresh')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-linesoft bg-raised flex items-center gap-2 text-[12px]">
          <ScanLine size={14} className="text-mute" />
          <span className="text-dim">
            {lang === 'el' ? 'Σκανάρετε τον κωδικό στην είσοδο.' : 'Hold the code to the reader at the entrance.'}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="p-3">
          <Flame size={15} className="text-volt" />
          <p className="display text-[21px] font-extrabold mt-1.5 tnum">
            {monthsAsMember}
          </p>
          <p className="text-[11px] text-dim leading-tight">
            {lang === 'el' ? 'Μήνες ως μέλος' : 'Months as a member'}
          </p>
        </Card>
        <Card className="p-3">
          <CalendarCheck size={15} className="text-volt" />
          <p className="display text-[21px] font-extrabold mt-1.5 tnum">{membership.days_left}</p>
          <p className="text-[11px] text-dim leading-tight">{t('daysLeftShort')}</p>
        </Card>
      </div>

      <Announcements />
    </div>
  )
}
