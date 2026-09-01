import { useEffect, useState } from 'react'
import { Dumbbell, Eye, EyeOff, KeyRound, QrCode, RefreshCcw, ScanFace, UserCheck2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QrMosaic } from '@/components/ui/QrMosaic'
import { formatMemberId } from '@/lib/format'
import { makeAccessToken } from '@/lib/qrPattern'

const TOKEN_TTL = 15

export function MembershipCardPage() {
  const { user, regenerateCheckInPin } = useAuth()
  const { loading, membership, currentPlan } = useGymData()
  const { showToast } = useToast()

  const [pinRevealed, setPinRevealed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [token, setToken] = useState(makeAccessToken)
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_TTL)

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((v) => {
        if (v <= 1) {
          setToken(makeAccessToken())
          return TOKEN_TTL
        }
        return v - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  if (loading || !user || !membership || !currentPlan) return <PageLoader label="Loading your card…" />

  const memberId = formatMemberId(user.id)
  const pin = user.security.checkInPin
  const ringCircumference = 2 * Math.PI * 13

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Membership Card</h2>
        <p className="mt-1 text-[13px] text-dim">Your digital badge and secure check-in code for the gym.</p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="relative overflow-hidden rounded-[16px] bg-bg shadow-lift">
          <div className="hazard h-1 opacity-90" />
          <div className="relative p-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 0%, rgba(216,255,51,0.12), transparent 45%), radial-gradient(circle at 100% 100%, rgba(255,106,31,0.12), transparent 45%)',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-volt text-voltink">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <span className="font-display text-[13px] font-extrabold uppercase tracking-[.05em] text-ink">
                  FlexPass
                </span>
              </div>
              <Badge tone={membership.status === 'active' ? 'good' : 'warn'} size="sm">
                {membership.status === 'active' ? 'Active' : membership.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="relative mt-8 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold text-ink">{user.name}</p>
                <p className="mt-0.5 text-[10.5px] uppercase tracking-[.14em] text-mute">{currentPlan.name} member</p>
                <p className="font-mono mt-4 text-[13px] tracking-wider text-dim">{memberId}</p>
                <p className="mt-1 text-[11px] text-mute">{membership.homeLocation}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setToken(makeAccessToken())
                  setSecondsLeft(TOKEN_TTL)
                }}
                className="relative shrink-0 rounded-[10px] bg-white p-2 transition-transform hover:scale-[1.02]"
                aria-label="Tap to refresh your code"
              >
                <QrMosaic seed={token} size={92} />
              </button>
            </div>

            <div className="relative mt-5 flex items-center gap-2.5 border-t border-linesoft pt-4">
              <svg width={28} height={28} viewBox="0 0 28 28" className="-rotate-90" aria-hidden="true">
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
                  strokeDashoffset={ringCircumference * (1 - secondsLeft / TOKEN_TTL)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div>
                <p className="font-mono text-[12px] font-semibold tracking-[.08em] text-volt">{token}</p>
                <p className="text-[10.5px] text-mute">Rotates in {secondsLeft}s · tap the code to refresh</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="mx-auto w-full max-w-md">
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-volt" />
              Check-in PIN
            </p>
            <p className="text-[11.5px] text-mute">Use this at the front-desk kiosk if you don't have your phone.</p>
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

      <Card className="mx-auto w-full max-w-md">
        <CardBody>
          <h3 className="font-display mb-3 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">
            How to check in
          </h3>
          <ul className="flex flex-col gap-3 text-[13px] text-dim">
            <HowToRow icon={<QrCode className="h-4 w-4" />} text="Scan your QR code at the entry kiosk." />
            <HowToRow icon={<KeyRound className="h-4 w-4" />} text="Or enter your 4-digit PIN on the kiosk keypad." />
            <HowToRow icon={<ScanFace className="h-4 w-4" />} text="Or show this screen to a front-desk staff member." />
            <HowToRow icon={<UserCheck2 className="h-4 w-4" />} text="Every check-in counts toward your visit streak." />
          </ul>
        </CardBody>
      </Card>

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

function HowToRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-voltline bg-voltsoft text-volt">
        {icon}
      </span>
      {text}
    </li>
  )
}
