import { useEffect, useState } from 'react'
import {
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Maximize2,
  RefreshCcw,
  ShieldCheck,
  Snowflake,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QrCode } from '@/components/ui/QrCode'
import { formatMemberId } from '@/lib/format'
import { displayStatus, type MemberDisplayStatus } from '@/lib/access'
import { ROTATE_SECONDS, currentWindowStart, secondsUntilRotation } from '@/lib/accessToken'
import { fetchCheckInToken } from '@/lib/db'

const STATUS_NOTE: Record<MemberDisplayStatus, string | null> = {
  active: null,
  expiring: null,
  frozen: "This code won't open the door — your membership is frozen.",
  expired: "This code won't open the door — your membership expired.",
  cancelled: "This code won't open the door — your membership is cancelled.",
}

export function CheckInPage() {
  const { user } = useAuth()
  const { loading, membership, currentPlan } = useGymData()

  const [fullscreen, setFullscreen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilRotation())

  // Re-signs the token exactly when the real rotation window changes, and
  // otherwise just re-reads the true remaining time each tick — no drift
  // from a naive local countdown, and every device showing this member's
  // code agrees on when it rotates because it's derived from wall-clock
  // time, not from when this component happened to mount.
  // The code is minted by the server, not here. This app holds no signing
  // key, so it can't produce a token for itself or anyone else — it asks for
  // one, once per rotation window, and renders whatever comes back. That is
  // what makes a screenshot of somebody else's screen worthless and what
  // lets the front desk verify a phone it has never seen before.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    let lastWindow = -1
    let inFlight = false

    async function tick() {
      setSecondsLeft(secondsUntilRotation())
      const windowStart = currentWindowStart()
      if (windowStart === lastWindow || inFlight) return
      inFlight = true
      try {
        const next = await fetchCheckInToken()
        if (!cancelled) {
          // Only advance the window marker once a token actually arrived,
          // so a dropped request retries next tick instead of leaving the
          // member staring at a stale code for a full minute.
          lastWindow = windowStart
          setToken(next.token)
          setSecondsLeft(next.secondsLeft)
          setTokenError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setTokenError(err instanceof Error ? err.message : 'Could not reach the server.')
        }
      } finally {
        inFlight = false
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [user])

  if (loading || !user || !membership || !currentPlan) return <PageLoader label="Loading your check-in code…" />

  const memberId = formatMemberId(user.id)
  const status = displayStatus(membership)
  const statusNote = STATUS_NOTE[status]
  const ringCircumference = 2 * Math.PI * 13
  const ok = status === 'active' || status === 'expiring'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <PageHeader
        title="Check In"
        subtitle={`Hold this at the reader. The code changes every ${ROTATE_SECONDS} seconds.`}
      />

      {statusNote && (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-badsoft bg-badsoft px-4 py-3 text-[12.5px] leading-snug text-bad">
          {status === 'frozen' ? (
            <Snowflake className="mt-px h-4 w-4 shrink-0" />
          ) : (
            <TriangleAlert className="mt-px h-4 w-4 shrink-0" />
          )}
          <span>{statusNote}</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="hazard h-1 opacity-90" />
        <CardBody className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-bold leading-none text-ink">{user.name}</p>
              <Badge tone={ok ? 'good' : 'bad'} size="sm">
                {ok ? 'Active' : status}
              </Badge>
            </div>
            <p className="text-[10.5px] uppercase tracking-[.14em] text-mute">
              {currentPlan.name} · {membership.homeLocation}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            disabled={!token}
            className="group relative rounded-[14px] shadow-lift transition-transform active:scale-[0.985] disabled:opacity-60"
            aria-label="Show full-screen for scanning"
          >
            {token ? (
              <QrCode value={token} size={216} />
            ) : (
              <div className="grid h-[236px] w-[236px] place-items-center rounded-[10px] bg-white">
                {tokenError ? (
                  <p className="max-w-[11rem] px-3 text-center text-[11.5px] font-medium leading-snug text-red-600">
                    {tokenError}
                  </p>
                ) : (
                  <div className="a-fade h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black/50" />
                )}
              </div>
            )}
            <span className="pointer-events-none absolute bottom-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <svg width={24} height={24} viewBox="0 0 28 28" className="-rotate-90 shrink-0" aria-hidden="true">
              <circle cx="14" cy="14" r="13" fill="none" stroke="var(--grid)" strokeWidth="2.5" />
              <circle
                cx="14"
                cy="14"
                r="13"
                fill="none"
                stroke="var(--volt)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - secondsLeft / ROTATE_SECONDS)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <p className="text-[11.5px] text-mute">
              New code in <span className="font-mono tnum text-ink">{secondsLeft}s</span> · tap to enlarge
            </p>
          </div>

          <p className="font-mono text-[11.5px] tracking-wider text-mute">{memberId}</p>
        </CardBody>
      </Card>

      <BackupPinCard />

      {fullscreen && token && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black p-6"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen check-in code"
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <QrCode value={token} size={Math.min(320, window.innerWidth - 96)} />
          <div className="text-center">
            <p className="font-mono tnum text-[13px] text-white/70">New code in {secondsLeft}s</p>
            <p className="mt-1 text-[12px] text-white/50">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The backup PIN, deliberately demoted to a collapsed row.
 *
 * It used to sit here as an equal-weight second way in, reading "give staff
 * this 4-digit code" — which invites exactly the thing that makes a QR
 * pointless: reading your PIN out to someone else. It isn't a second way
 * in. It does nothing at all until a staff member has opened a window for
 * this specific member by name, so the copy's whole job is to say that.
 */
function BackupPinCard() {
  const { user, regenerateCheckInPin } = useAuth()
  const { pinAllowance } = useGymData()
  const { showToast } = useToast()

  const [expanded, setExpanded] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!user) return null
  const pin = user.security.checkInPin

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-line bg-raised text-dim">
          <KeyRound className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink">Phone dead? Backup PIN</span>
          <span className="block text-[11.5px] text-mute">
            {pinAllowance.remaining} of {pinAllowance.limit} left this month
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mute transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="a-fade flex flex-col gap-3.5 border-t border-linesoft p-4">
          <div className="flex items-start gap-2.5 rounded-[9px] border border-line bg-raised px-3.5 py-3 text-[11.5px] leading-relaxed text-dim">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-volt" />
            <span>
              Your PIN can't be typed at the reader on its own — the keypad isn't there. Ask a staff member,
              they'll find you by name and open it for you. That's what makes it safe to keep it short, and
              why telling someone else your PIN gets them precisely nowhere.
            </span>
          </div>

          <div className="flex items-center justify-between rounded-[9px] bg-raised px-4 py-3">
            <span className="font-mono text-[24px] font-bold leading-none tracking-[0.3em] text-ink">
              {revealed ? pin : '••••'}
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="-mr-1 rounded-[7px] p-2 text-dim transition-colors hover:bg-line hover:text-ink"
              aria-label={revealed ? 'Hide PIN' : 'Show PIN'}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {pinAllowance.overLimit ? (
            <p className="text-[11.5px] leading-snug text-warn">
              You've used all {pinAllowance.limit} backup check-ins in the last {pinAllowance.windowDays} days.
              Staff can still let you in, but they'll have to override it.
            </p>
          ) : (
            <p className="text-[11.5px] leading-snug text-mute">
              Good for {pinAllowance.limit} check-ins per {pinAllowance.windowDays} days — it's the spare key,
              not the front door.
            </p>
          )}

          <Button
            variant="quiet"
            size="sm"
            className="self-start"
            onClick={() => setConfirmOpen(true)}
            iconLeft={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Regenerate PIN
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        icon={<RefreshCcw className="h-4 w-4" />}
        title="Regenerate your PIN?"
        description="Your current PIN will stop working immediately."
        confirmLabel="Regenerate"
        onConfirm={async () => {
          try {
            const newPin = await regenerateCheckInPin()
            setRevealed(true)
            showToast(`Your new PIN is ${newPin}.`)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not regenerate PIN.', 'error')
          } finally {
            setConfirmOpen(false)
          }
        }}
      />
    </Card>
  )
}
