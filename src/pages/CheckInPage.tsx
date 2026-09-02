import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Maximize2, RefreshCcw, Snowflake, TriangleAlert, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QrCode } from '@/components/ui/QrCode'
import { formatMemberId } from '@/lib/format'
import { displayStatus, type MemberDisplayStatus } from '@/lib/access'
import { ROTATE_SECONDS, currentWindowStart, secondsUntilRotation, signCheckInToken } from '@/lib/accessToken'

const STATUS_NOTE: Record<MemberDisplayStatus, string | null> = {
  active: null,
  expiring: null,
  frozen: "This code won't open the door — your membership is frozen.",
  expired: "This code won't open the door — your membership expired.",
  cancelled: "This code won't open the door — your membership is cancelled.",
}

export function CheckInPage() {
  const { user, regenerateCheckInPin } = useAuth()
  const { loading, membership, currentPlan } = useGymData()
  const { showToast } = useToast()

  const [pinRevealed, setPinRevealed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilRotation())

  // Re-signs the token exactly when the real rotation window changes, and
  // otherwise just re-reads the true remaining time each tick — no drift
  // from a naive local countdown, and every device showing this member's
  // code agrees on when it rotates because it's derived from wall-clock
  // time, not from when this component happened to mount.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    let lastWindow = -1

    async function tick() {
      setSecondsLeft(secondsUntilRotation())
      const windowStart = currentWindowStart()
      if (windowStart === lastWindow) return
      lastWindow = windowStart
      try {
        const next = await signCheckInToken(user!.id, user!.security.checkInSecret)
        if (!cancelled) {
          setToken(next)
          setTokenError(false)
        }
      } catch {
        if (!cancelled) setTokenError(true)
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
  const pin = user.security.checkInPin
  const status = displayStatus(membership)
  const statusNote = STATUS_NOTE[status]
  const ringCircumference = 2 * Math.PI * 13

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Check In</h2>
        <p className="mt-1 text-[13px] text-dim">Show this at the door — it rotates every {ROTATE_SECONDS}s.</p>
      </div>

      {statusNote && (
        <div className="mx-auto flex w-full max-w-md items-start gap-2.5 rounded-[10px] border border-badsoft bg-badsoft px-4 py-3 text-[12.5px] text-bad">
          {status === 'frozen' ? (
            <Snowflake className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{statusNote}</span>
        </div>
      )}

      <div className="mx-auto w-full max-w-md">
        <Card className="overflow-hidden">
          <div className="hazard h-1 opacity-90" />
          <CardBody className="flex flex-col items-center gap-4 py-7 text-center">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-bold text-ink">{user.name}</p>
              <Badge tone={status === 'active' || status === 'expiring' ? 'good' : 'bad'} size="sm">
                {status === 'active' || status === 'expiring' ? 'Active' : status}
              </Badge>
            </div>
            <p className="-mt-2.5 text-[11px] uppercase tracking-[.14em] text-mute">
              {currentPlan.name} · {membership.homeLocation}
            </p>

            <button
              type="button"
              onClick={() => setFullscreen(true)}
              disabled={!token}
              className="group relative rounded-[14px] bg-white p-1 shadow-lift transition-transform active:scale-[0.98] disabled:opacity-60"
              aria-label="Show full-screen for scanning"
            >
              {token ? (
                <QrCode value={token} size={196} />
              ) : (
                <div className="grid h-[216px] w-[216px] place-items-center">
                  {tokenError ? (
                    <p className="max-w-[10rem] text-[11px] font-medium text-red-600">
                      Couldn't generate your code. Check your connection and reload.
                    </p>
                  ) : (
                    <div className="a-fade h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black/50" />
                  )}
                </div>
              )}
              <span className="pointer-events-none absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-3.5 w-3.5" />
              </span>
            </button>

            <div className="flex items-center gap-2.5">
              <svg width={26} height={26} viewBox="0 0 28 28" className="-rotate-90 shrink-0" aria-hidden="true">
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
                Rotates in <span className="font-mono text-ink">{secondsLeft}s</span> · tap the code to enlarge
              </p>
            </div>

            <p className="font-mono mt-1 text-[11.5px] tracking-wider text-mute">{memberId}</p>
          </CardBody>
        </Card>
      </div>

      <Card className="mx-auto w-full max-w-md">
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-volt" />
              No phone signal? Use your PIN
            </p>
            <p className="text-[11.5px] text-mute">Give staff this 4-digit code and they'll check you in.</p>
          </div>

          <div className="flex items-center justify-between rounded-[9px] bg-raised px-4 py-3.5">
            <span className="font-mono text-[24px] font-bold tracking-[0.3em] text-ink">
              {pinRevealed ? pin : '••••'}
            </span>
            <button
              type="button"
              onClick={() => setPinRevealed((v) => !v)}
              className="rounded-[7px] p-2 text-dim hover:bg-line hover:text-ink"
              aria-label={pinRevealed ? 'Hide PIN' : 'Show PIN'}
            >
              {pinRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button variant="quiet" size="sm" onClick={() => setConfirmOpen(true)} iconLeft={<RefreshCcw className="h-3.5 w-3.5" />}>
            Regenerate PIN
          </Button>
        </CardBody>
      </Card>

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
            <p className="font-mono text-[13px] text-white/70">Rotates in {secondsLeft}s</p>
            <p className="mt-1 text-[12px] text-white/50">Tap anywhere to close</p>
          </div>
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
            setPinRevealed(true)
            showToast(`Your new PIN is ${newPin}.`)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not regenerate PIN.', 'error')
          } finally {
            setConfirmOpen(false)
          }
        }}
      />
    </div>
  )
}
