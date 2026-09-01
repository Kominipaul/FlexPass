import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Loader2,
  QrCode,
  ScanLine,
  Shuffle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { StatusPill } from '@/components/admin/StatusPill'
import { reasonText } from '@/lib/access'
import { daysUntil, formatDateTime, formatMemberId } from '@/lib/format'
import type { AdminMemberRow } from '@/lib/db'
import type { CheckInMethod, DoorReasonCode, DoorScan } from '@/types'

function beep(kind: 'granted' | 'denied', muted: boolean) {
  if (muted) return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const notes: [number, number][] = kind === 'granted' ? [[880, 0], [1320, 0.09]] : [[220, 0], [165, 0.12]]
    notes.forEach(([freq, at]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = kind === 'granted' ? 'sine' : 'square'
      osc.frequency.setValueAtTime(freq, now + at)
      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + at)
      osc.stop(now + at + 0.2)
    })
    window.setTimeout(() => ctx.close(), 600)
  } catch {
    // audio unavailable — the visual result still renders
  }
}

function SoundBars({ tone }: { tone: 'granted' | 'denied' }) {
  return (
    <span className="inline-flex h-4 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 0.09}s`, height: '100%' }}
          className={`a-bar w-[3px] rounded-full ${tone === 'granted' ? 'bg-good' : 'bg-bad'}`}
        />
      ))}
    </span>
  )
}

type Phase = 'idle' | 'scanning' | 'result'

interface ScanResult {
  member: AdminMemberRow
  scan: DoorScan
}

export function ScannerPage() {
  const { loading, members, atLocationId, locations, recordScan, doorScans } = useAdminData()
  const [pick, setPick] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [muted, setMuted] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (!pick && members.length > 0) setPick(members[0].user.id)
  }, [members, pick])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  if (loading) return <PageLoader label="Loading front desk…" />

  const activeLocation = locations.find((l) => l.id === atLocationId)

  function runScan(userId: string) {
    const member = members.find((m) => m.user.id === userId)
    if (!member) return
    timers.current.forEach((t) => window.clearTimeout(t))
    setPhase('scanning')
    setResult(null)
    timers.current = [
      window.setTimeout(async () => {
        const { scan } = await recordScan(userId, atLocationId, 'QR' as CheckInMethod)
        setResult({ member, scan })
        setPhase('result')
        beep(scan.result === 'granted' ? 'granted' : 'denied', muted)
      }, 900),
      window.setTimeout(() => setPhase('idle'), 7500),
    ]
  }

  function randomScan() {
    if (members.length === 0) return
    const member = members[Math.floor(Math.random() * members.length)]
    setPick(member.user.id)
    runScan(member.user.id)
  }

  const granted = result?.scan.result === 'granted'
  const daysLeft = result ? daysUntil(result.member.membership.renewalDate) : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Front Desk</h2>
        <p className="mt-1 text-[13px] text-dim">
          {activeLocation ? activeLocation.name : 'Select a location'} · scan a member to check them in
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <Card
          className="relative min-w-0 overflow-hidden transition-colors duration-300"
          style={
            phase === 'result'
              ? {
                  backgroundColor: granted ? 'var(--good-soft)' : 'var(--bad-soft)',
                  borderColor: granted ? 'var(--good)' : 'var(--bad)',
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-3 border-b border-linesoft px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-voltline bg-voltsoft text-volt">
                <ScanLine className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-[13px] font-bold uppercase leading-none tracking-[.05em] text-ink">
                  Turnstile reader
                </p>
                <p className="mt-1 text-[11px] text-mute">{activeLocation?.name ?? '—'} · lane 1</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMuted((v) => !v)}
              aria-pressed={!muted}
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-raised px-2.5 text-[11.5px] text-dim transition-colors hover:text-ink"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {muted ? 'Muted' : 'Sound on'}
            </button>
          </div>

          <div className="grid min-h-[340px] place-items-center p-5 text-center">
            {phase === 'idle' && (
              <div className="a-fade">
                <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-[14px] border-2 border-dashed border-line text-mute">
                  <QrCode className="h-10 w-10" strokeWidth={1.4} />
                </div>
                <p className="font-display mt-4 text-[15px] font-bold uppercase tracking-[.05em] text-ink">
                  Waiting for a pass
                </p>
                <p className="mx-auto mt-1.5 max-w-xs text-[12px] text-dim">
                  Pick a member and scan, or simulate whoever walks up next.
                </p>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="a-fade">
                <div className="relative mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-[14px] border-2 border-volt bg-raised">
                  <QrCode className="h-10 w-10 text-volt opacity-60" strokeWidth={1.4} />
                  <span className="a-sweep absolute inset-x-0 h-[2px] bg-volt shadow-[0_0_14px_var(--volt)]" />
                </div>
                <p className="font-display mt-4 flex items-center justify-center gap-2 text-[15px] font-bold uppercase tracking-[.05em] text-ink">
                  <Loader2 className="a-spin h-4 w-4 animate-spin" />
                  Reading token…
                </p>
                <p className="font-mono mt-1 text-[12px] text-dim">Verifying rotation window</p>
              </div>
            )}

            {phase === 'result' && result && (
              <div className="a-pop w-full">
                <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${granted ? 'bg-good' : 'bg-bad'} text-voltink`}>
                  {granted ? <Check className="h-8 w-8" strokeWidth={3.4} /> : <X className="h-8 w-8" strokeWidth={3.4} />}
                </div>
                <h2 className={`font-display mt-4 text-[28px] font-extrabold uppercase leading-none tracking-[-.01em] sm:text-[34px] ${granted ? 'text-good' : 'text-bad'}`}>
                  {granted ? 'Access granted' : 'Access denied'}
                </h2>
                <p className="mt-2.5 text-[13px] font-medium text-ink">
                  {reasonText({ reasonCode: result.scan.reasonCode, daysLeft })}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <SoundBars tone={granted ? 'granted' : 'denied'} />
                  <span className="text-[11px] text-dim">
                    {granted ? 'Two-tone chime · turnstile released' : 'Low buzzer · turnstile held'}
                  </span>
                </div>

                <div className="mt-5 inline-flex items-center gap-3 rounded-[9px] border border-line bg-surface px-3 py-2.5 text-left">
                  <Avatar name={result.member.user.name} tone={result.member.user.avatarColor} size="md" />
                  <div>
                    <p className="text-[13px] font-semibold leading-tight text-ink">{result.member.user.name}</p>
                    <p className="font-mono text-[11px] text-mute">
                      {formatMemberId(result.member.user.id)} · {result.member.plan.name}
                    </p>
                  </div>
                  <StatusPill membership={result.member.membership} size="sm" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-linesoft bg-raised p-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Choose a member">
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name} · {formatMemberId(m.user.id)}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => runScan(pick)} disabled={phase === 'scanning' || !pick} iconLeft={<ScanLine className="h-4 w-4" />}>
              Scan pass
            </Button>
            <Button variant="quiet" onClick={randomScan} disabled={phase === 'scanning'} iconLeft={<Shuffle className="h-4 w-4" />}>
              Simulate scan
            </Button>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
            <h3 className="font-display text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">Door log</h3>
            <span className="font-mono text-[11px] text-mute">{doorScans.length}</span>
          </div>
          <div className="scroll-thin max-h-[430px] divide-y divide-linesoft overflow-y-auto">
            {doorScans.map((s) => {
              const member = members.find((m) => m.user.id === s.userId)
              const loc = locations.find((l) => l.id === s.locationId)
              return (
                <div key={s.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      s.result === 'granted' ? 'bg-goodsoft text-good' : 'bg-badsoft text-bad'
                    }`}
                  >
                    {s.result === 'granted' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{member ? member.user.name : s.userId}</p>
                    <p className="truncate text-[11px] text-dim">{describeReason(s.reasonCode)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[11px] text-dim">{formatDateTime(s.timestamp).split(',').pop()}</p>
                    <p className="text-[10px] text-mute">{loc?.id === 'downtown' ? 'DT' : 'NS'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function describeReason(code: DoorReasonCode): string {
  return reasonText({ reasonCode: code })
}
