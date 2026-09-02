import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Check,
  KeyRound,
  Loader2,
  QrCode,
  ScanLine,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { useToast } from '@/context/ToastContext'
import { useCameraQrScanner } from '@/hooks/useCameraQrScanner'
import { PageLoader } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { OtpInput } from '@/components/ui/OtpInput'
import { StatusPill } from '@/components/admin/StatusPill'
import { reasonText } from '@/lib/access'
import { daysUntil, formatDateTime, formatMemberId } from '@/lib/format'
import type { AdminMemberRow } from '@/lib/db'
import type { DoorReasonCode, DoorScan } from '@/types'

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

type Mode = 'camera' | 'pin'
type Phase = 'scanning' | 'verifying' | 'result'

interface ScanResult {
  member: AdminMemberRow
  scan: DoorScan
}

const RESULT_DISPLAY_MS = 6000

export function ScannerPage() {
  const { loading, members, atLocationId, locations, doorScans, recordScanByToken, recordScanByPin } = useAdminData()
  const { showToast } = useToast()

  const [mode, setMode] = useState<Mode>('camera')
  const [phase, setPhase] = useState<Phase>('scanning')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [muted, setMuted] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinBusy, setPinBusy] = useState(false)
  const returnTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(returnTimer.current), [])

  // Gated on !loading too, not just mode: the <video> element below only
  // exists in the DOM once this page is past its loading guard, so the
  // camera must wait for that — otherwise it fires on a still-loading
  // render with nothing to attach the stream to, and (since `loading` isn't
  // itself part of what would normally re-trigger it) gets permanently
  // stuck reporting a spurious "could not start the camera" error.
  const { videoRef, status: cameraStatus, error: cameraError, retry: retryCamera } = useCameraQrScanner({
    active: !loading && mode === 'camera',
    cooldownMs: 3000,
    onDecode: (text) => {
      if (phase !== 'scanning') return
      void runTokenScan(text)
    },
  })

  if (loading) return <PageLoader label="Loading front desk…" />

  const activeLocation = locations.find((l) => l.id === atLocationId)

  function showResult(row: AdminMemberRow | undefined, scan: DoorScan) {
    if (!row) {
      showToast('Scan recorded, but that member record could not be loaded.', 'error')
      setPhase('scanning')
      return
    }
    setResult({ member: row, scan })
    setPhase('result')
    beep(scan.result === 'granted' ? 'granted' : 'denied', muted)
    window.clearTimeout(returnTimer.current)
    returnTimer.current = window.setTimeout(() => {
      setPhase('scanning')
      setResult(null)
    }, RESULT_DISPLAY_MS)
  }

  async function runTokenScan(token: string) {
    setPhase('verifying')
    try {
      const { scan, user } = await recordScanByToken(token, atLocationId)
      showResult(members.find((m) => m.user.id === user.id), scan)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not read that code.', 'error')
      setPhase('scanning')
    }
  }

  async function runPinScan() {
    setPinBusy(true)
    setPinError(null)
    setPhase('verifying')
    try {
      const { scan, user } = await recordScanByPin(pin, atLocationId)
      setPin('')
      showResult(members.find((m) => m.user.id === user.id), scan)
    } catch (err) {
      setPhase('scanning')
      setPinError(err instanceof Error ? err.message : 'Could not check in with that PIN.')
    } finally {
      setPinBusy(false)
    }
  }

  const granted = result?.scan.result === 'granted'
  const daysLeft = result ? daysUntil(result.member.membership.renewalDate) : 0
  const canSwitchMode = phase === 'scanning'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Front Desk</h2>
        <p className="mt-1 text-[13px] text-dim">
          {activeLocation ? activeLocation.name : 'Select a location'} · scan a member to check them in
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <Card className="relative min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linesoft px-4 py-3">
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
            <div className="flex items-center gap-2">
              <ModeTab active={mode === 'camera'} disabled={!canSwitchMode} onClick={() => setMode('camera')} icon={<Camera className="h-3.5 w-3.5" />} label="Camera" />
              <ModeTab active={mode === 'pin'} disabled={!canSwitchMode} onClick={() => setMode('pin')} icon={<KeyRound className="h-3.5 w-3.5" />} label="Enter PIN" />
              <button
                type="button"
                onClick={() => setMuted((v) => !v)}
                aria-pressed={!muted}
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line bg-raised px-2.5 text-[11.5px] text-dim transition-colors hover:text-ink"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{muted ? 'Muted' : 'Sound on'}</span>
              </button>
            </div>
          </div>

          <div className="relative min-h-[360px]">
            {/* Camera feed — kept mounted whenever the Camera tab is selected so the stream doesn't restart between scans. */}
            {mode === 'camera' && (
              <>
                <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full bg-black object-cover" />
                {phase === 'scanning' && cameraStatus === 'scanning' && (
                  <div className="a-fade pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="relative h-44 w-44">
                      <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-[10px] border-l-[3px] border-t-[3px] border-volt" />
                      <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-[10px] border-r-[3px] border-t-[3px] border-volt" />
                      <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-[10px] border-b-[3px] border-l-[3px] border-volt" />
                      <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-[10px] border-b-[3px] border-r-[3px] border-volt" />
                      <span className="a-sweep absolute inset-x-2 h-[2px] bg-volt shadow-[0_0_14px_var(--volt)]" />
                    </div>
                    <p className="font-display absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-bg/80 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[.04em] text-ink backdrop-blur">
                      Point the camera at the member's QR code
                    </p>
                  </div>
                )}
                {phase === 'scanning' && cameraStatus === 'starting' && (
                  <div className="absolute inset-0 grid place-items-center bg-bg/85">
                    <div className="a-fade text-center">
                      <Loader2 className="a-spin mx-auto h-6 w-6 animate-spin text-volt" />
                      <p className="mt-3 text-[13px] text-dim">Starting camera…</p>
                    </div>
                  </div>
                )}
                {phase === 'scanning' && cameraStatus === 'error' && (
                  <div className="absolute inset-0 grid place-items-center bg-bg/95 p-6">
                    <div className="a-fade max-w-xs text-center">
                      <CameraOff className="mx-auto h-8 w-8 text-mute" strokeWidth={1.4} />
                      <p className="mt-3 text-[13px] text-ink">{cameraError}</p>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button size="sm" variant="quiet" onClick={retryCamera} iconLeft={<Camera className="h-3.5 w-3.5" />}>
                          Try camera again
                        </Button>
                        <Button size="sm" onClick={() => setMode('pin')} iconLeft={<KeyRound className="h-3.5 w-3.5" />}>
                          Use PIN
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'pin' && phase === 'scanning' && (
              <div className="a-fade grid min-h-[360px] place-items-center p-6 text-center">
                <div className="w-full max-w-[19rem]">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-voltline bg-voltsoft text-volt">
                    <KeyRound className="h-6 w-6" />
                  </span>
                  <p className="font-display mt-4 text-[15px] font-bold uppercase tracking-[.05em] text-ink">
                    Enter check-in PIN
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-[12px] text-dim">
                    For a member without their phone — ask for their 4-digit code.
                  </p>
                  <div className="mt-5">
                    <OtpInput
                      length={4}
                      value={pin}
                      onChange={(v) => {
                        setPin(v)
                        setPinError(null)
                      }}
                      disabled={pinBusy}
                      error={!!pinError}
                    />
                  </div>
                  {pinError && <p className="mt-2.5 text-[12px] text-bad">{pinError}</p>}
                  <Button
                    className="mt-5"
                    fullWidth
                    disabled={pin.length !== 4}
                    loading={pinBusy}
                    onClick={runPinScan}
                    iconLeft={<ScanLine className="h-3.5 w-3.5" />}
                  >
                    Check in
                  </Button>
                </div>
              </div>
            )}

            {phase === 'verifying' && (
              <div className="absolute inset-0 grid place-items-center bg-bg/90">
                <div className="a-fade text-center">
                  <Loader2 className="a-spin mx-auto h-7 w-7 animate-spin text-volt" />
                  <p className="font-display mt-3 text-[13px] font-bold uppercase tracking-[.05em] text-ink">
                    Verifying…
                  </p>
                  <p className="font-mono mt-1 text-[11.5px] text-dim">Checking signature &amp; membership</p>
                </div>
              </div>
            )}

            {phase === 'result' && result && (
              <div
                className="a-pop absolute inset-0 grid place-items-center p-5 text-center"
                style={{ backgroundColor: granted ? 'var(--good-soft)' : 'var(--bad-soft)' }}
              >
                <div className="w-full">
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

                  <button
                    type="button"
                    onClick={() => {
                      window.clearTimeout(returnTimer.current)
                      setPhase('scanning')
                      setResult(null)
                    }}
                    className="mt-4 text-[11.5px] font-semibold text-dim underline underline-offset-2 hover:text-ink"
                  >
                    Dismiss now
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
            <h3 className="font-display text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">Door log</h3>
            <span className="font-mono text-[11px] text-mute">{doorScans.length}</span>
          </div>
          <DoorLog />
        </Card>
      </div>
    </div>
  )
}

function ModeTab({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !active}
      className={`font-display inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11px] font-bold uppercase tracking-[.04em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'border-volt bg-voltsoft text-volt' : 'border-line bg-raised text-dim hover:text-ink'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function DoorLog() {
  const { doorScans, members, locations } = useAdminData()
  return (
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
              <p className="flex items-center justify-end gap-1 text-[10px] text-mute">
                {s.method === 'QR' ? <QrCode className="h-2.5 w-2.5" /> : <KeyRound className="h-2.5 w-2.5" />}
                {loc?.id === 'downtown' ? 'DT' : 'NS'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function describeReason(code: DoorReasonCode): string {
  return reasonText({ reasonCode: code })
}
