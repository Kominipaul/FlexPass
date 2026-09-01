import { useState } from 'react'
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

export function MembershipCardPage() {
  const { user, regenerateCheckInPin } = useAuth()
  const { loading, membership, currentPlan } = useGymData()
  const { showToast } = useToast()

  const [pinRevealed, setPinRevealed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (loading || !user || !membership || !currentPlan) return <PageLoader label="Loading your card…" />

  const memberId = formatMemberId(user.id)
  const pin = user.security.checkInPin

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Membership Card</h2>
        <p className="mt-1 text-sm text-slate-500">Your digital badge and secure check-in code for the gym.</p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-6 text-white shadow-pop">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 0%, rgba(99,102,241,0.55), transparent 45%), radial-gradient(circle at 100% 100%, rgba(163,230,53,0.3), transparent 45%)',
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Dumbbell className="h-4 w-4" />
              </span>
              <span className="text-sm font-extrabold tracking-tight">FlexPass</span>
            </div>
            <Badge tone={membership.status === 'active' ? 'lime' : 'amber'} size="sm">
              {membership.status === 'active' ? 'Active' : membership.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="relative mt-8 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{user.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-400">{currentPlan.name} member</p>
              <p className="mt-4 font-mono text-sm tracking-wider text-slate-300">{memberId}</p>
              <p className="mt-1 text-xs text-slate-400">{membership.homeLocation}</p>
            </div>
            <div className="shrink-0 rounded-xl bg-white p-2">
              <QrMosaic seed={user.id} size={92} />
            </div>
          </div>
        </div>
      </div>

      <Card className="mx-auto w-full max-w-md">
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                <KeyRound className="h-4 w-4 text-brand-600" />
                Check-in PIN
              </p>
              <p className="text-xs text-slate-500">Use this at the front-desk kiosk if you don't have your phone.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5">
            <span className="font-mono text-2xl font-bold tracking-[0.3em] text-ink-900">
              {pinRevealed ? pin : '••••'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPinRevealed((v) => !v)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
                aria-label={pinRevealed ? 'Hide PIN' : 'Show PIN'}
              >
                {pinRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} iconLeft={<RefreshCcw className="h-3.5 w-3.5" />}>
            Regenerate PIN
          </Button>
        </CardBody>
      </Card>

      <Card className="mx-auto w-full max-w-md">
        <CardBody>
          <h3 className="mb-3 text-sm font-semibold text-ink-900">How to check in</h3>
          <ul className="flex flex-col gap-3 text-sm text-slate-600">
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      {text}
    </li>
  )
}
