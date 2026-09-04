import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Check,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  Timer,
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
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { OtpInput } from '@/components/ui/OtpInput'
import { StatusPill } from '@/components/admin/StatusPill'
import { reasonText } from '@/lib/access'
import { daysUntil, formatDateTime, formatMemberId, relativeTime } from '@/lib/format'
import { PIN_MAX_ATTEMPTS, pinAllowanceFrom, type PinAllowance } from '@/lib/pinPolicy'
import type { AdminMemberRow } from '@/lib/db'
import type { DoorReasonCode, DoorScan, PinUnlock } from '@/types'

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

type Phase = 'scanning' | 'verifying' | 'result'

interface ScanResult {
  member: AdminMemberRow
  scan: DoorScan
}

const RESULT_DISPLAY_MS = 6000

/**
 * The reader, as it sits on the stand by the turnstile.
 *
 * The screen a member walks up to shows one thing: a camera. There is no
 * PIN tab, because a keypad standing there all day is an invitation to try
 * four digits — and if any PIN could be typed at any time, the rotating QR
 * would be decoration. The keypad only exists after a staff member has
 * looked someone up by name and opened a window for them, and even then it
 * only accepts *that* person's PIN, for three tries, for five minutes.
 */
export function ScannerPage() {
  const { loading, members, atLocationId, locations, doorScans, pinUnlocks, recordScanByToken, attemptPinUnlock, cancelPinUnlock, refresh } =
    useAdminData()
  const { showToast } = useToast()

  const [phase, setPhase] = useState<Phase>('scanning')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [muted, setMuted] = useState(false)
  const [staffPanelOpen, setStaffPanelOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinBusy, setPinBusy] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const returnTimer = useRef<number | undefined>(undefined)

  // The live window is read back out of the store rather than held in local
  // state, so it survives a reload of the kiosk and a staffer opening it
  // from a second device behaves the same as opening it here.
  const openRow = useMemo(
    () => pinUnlocks.find((u) => u.status === 'open' && u.locationId === atLocationId) ?? null,
    [pinUnlocks, atLocationId],
  )
  const expiresAtMs = openRow ? new Date(openRow.expiresAt).getTime() : 0
  const unlock = openRow && expiresAtMs > nowMs ? openRow : null
  const unlockMember = members.find((m) => m.user.id === unlock?.userId) ?? null
  const pinMode = !!unlock && phase !== 'result'

  useEffect(() => () => window.clearTimeout(returnTimer.current), [])

  // Ticks only while a window is actually live: it drives the countdown and,
  // the moment that reaches zero, stops itself and re-reads the store so the
  // row comes back as 'expired' and the keypad drops on its own. Without the
  // re-read the store keeps saying 'open' and this would tick forever.
  useEffect(() => {
    if (!openRow) return
    const id = window.setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (now >= expiresAtMs) {
        window.clearInterval(id)
        void refresh()
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [openRow, expiresAtMs, refresh])

  // Keyed on the window's id, not the object: a fresh window opening for the
  // next member must clear the previous member's red error line, or they walk
  // up to a keypad already accusing them of a wrong try that was not theirs.
  useEffect(() => {
    setPin('')
    setPinError(null)
  }, [unlock?.id])

  // Gated on !loading too, not just mode: the <video> element below only
  // exists in the DOM once this page is past its loading guard, so the
  // camera must wait for that — otherwise it fires on a still-loading
  // render with nothing to attach the stream to, and (since `loading` isn't
  // itself part of what would normally re-trigger it) gets permanently
  // stuck reporting a spurious "could not start the camera" error.
  const { videoRef, status: cameraStatus, error: cameraError, retry: retryCamera } = useCameraQrScanner({
    active: !loading && !pinMode,
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
      const { scan, user, membership, plan } = await recordScanByToken(token, atLocationId)
      showResult(members.find((m) => m.user.id === user.id) ?? { user, membership, plan }, scan)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not read that code.', 'error')
      setPhase('scanning')
    }
  }

  async function submitPin(value: string) {
    if (!unlock) return
    setPinBusy(true)
    setPinError(null)
    try {
      const outcome = await attemptPinUnlock(unlock.id, value)
      if (outcome.ok) {
        setPin('')
        setPhase('verifying')
        showResult(
          members.find((m) => m.user.id === outcome.user.id) ??
            { user: outcome.user, membership: outcome.membership, plan: outcome.plan },
          outcome.scan,
        )
      } else if (outcome.unlock.attemptsLeft > 0) {
        setPin('')
        setPinError(
          `That's not the right PIN. ${outcome.unlock.attemptsLeft} ${outcome.unlock.attemptsLeft === 1 ? 'try' : 'tries'} left.`,
        )
      } else {
        // The window is now 'locked', so this keypad is about to unmount —
        // and the error line lives inside it. A toast outlives the unmount,
        // which is the only reason the member ever learns why it vanished.
        setPin('')
        showToast('Three wrong tries — the keypad is closed. Ask the desk to reopen it.', 'error')
      }
    } catch (err) {
      setPin('')
      setPinError(err instanceof Error ? err.message : 'Could not check that PIN.')
    } finally {
      setPinBusy(false)
    }
  }

  const granted = result?.scan.result === 'granted'
  const daysLeft = result ? daysUntil(result.member.membership.renewalDate) : 0
  const secondsLeft = unlock ? Math.max(0, Math.round((new Date(unlock.expiresAt).getTime() - nowMs) / 1000)) : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[21px] font-extrabold text-ink sm:text-[23px]">Front Desk</h2>
          <p className="mt-1 text-[12.5px] text-dim">
            {activeLocation ? activeLocation.name : 'Select a location'} · members scan their own code to get in
          </p>
        </div>
        {/* The only route to a keypad. Deliberately reads as a staff control, not a member option. */}
        <Button
          variant="quiet"
          size="sm"
          onClick={() => setStaffPanelOpen(true)}
          iconLeft={<Lock className="h-3.5 w-3.5" />}
        >
          Staff · backup entry
        </Button>
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
              {pinMode && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-emberline bg-embersoft px-2.5 text-[11px] font-bold text-ember">
                  <KeyRound className="h-3.5 w-3.5" />
                  PIN window open
                </span>
              )}
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
            {/* Camera feed — kept mounted whenever no PIN window is open, so the stream doesn't restart between scans. */}
            {!pinMode && (
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
                      Hold your code up to the camera
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
                        <Button size="sm" onClick={() => setStaffPanelOpen(true)} iconLeft={<Lock className="h-3.5 w-3.5" />}>
                          Staff backup entry
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {pinMode && unlock && (
              <div className="a-fade grid min-h-[360px] place-items-center p-6 text-center">
                <div className="w-full max-w-[19rem]">
                  <div className="flex items-center justify-center gap-2.5">
                    {unlockMember && (
                      <Avatar name={unlockMember.user.name} tone={unlockMember.user.avatarColor} size="sm" />
                    )}
                    <div className="text-left">
                      <p className="text-[13px] font-semibold leading-tight text-ink">
                        {unlockMember?.user.name ?? 'Member'}
                      </p>
                      <p className="font-mono text-[10.5px] text-mute">
                        {unlockMember ? formatMemberId(unlockMember.user.id) : ''}
                      </p>
                    </div>
                  </div>

                  <p className="font-display mt-4 text-[15px] font-bold uppercase tracking-[.05em] text-ink">
                    Enter your PIN
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-[11.5px] leading-snug text-dim">
                    Type it yourself — the desk doesn't need to hear it.
                  </p>

                  <div className="mt-5">
                    <OtpInput
                      length={4}
                      value={pin}
                      onChange={(v) => {
                        setPin(v)
                        setPinError(null)
                        if (v.length === 4) void submitPin(v)
                      }}
                      disabled={pinBusy}
                      error={!!pinError}
                    />
                  </div>

                  {pinError && <p className="mt-2.5 text-[12px] leading-snug text-bad">{pinError}</p>}

                  <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-mute">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5" />
                      <span className="font-mono tnum">
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: PIN_MAX_ATTEMPTS }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${i < unlock.attemptsLeft ? 'bg-volt' : 'bg-line'}`}
                        />
                      ))}
                      <span className="ml-1">
                        {unlock.attemptsLeft} {unlock.attemptsLeft === 1 ? 'try' : 'tries'} left
                      </span>
                    </span>
                  </div>

                  {unlock.override && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-warn">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Staff override — over the monthly allowance
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      await cancelPinUnlock(unlock.id)
                      setPin('')
                      setPinError(null)
                    }}
                    className="mt-4 text-[11.5px] font-semibold text-dim underline underline-offset-2 hover:text-ink"
                  >
                    Cancel and go back to scanning
                  </button>
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

      <BackupEntryPanel
        open={staffPanelOpen}
        onClose={() => {
          setStaffPanelOpen(false)
          void refresh()
        }}
      />
    </div>
  )
}

/**
 * Step one of a backup entry: a staff member finds the person in front of
 * them. Nothing here takes a PIN — this is the "who are you" half, done by
 * a human with a member list and, if they want it, a photo ID. The four
 * digits typed afterwards only have to confirm it.
 */
function BackupEntryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { members, checkIns, pinUnlocks, openPinUnlock } = useAdminData()
  const { showToast } = useToast()

  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<AdminMemberRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setQ('')
      setSelected(null)
    }
  }, [open])

  const allowanceFor = (userId: string): PinAllowance =>
    pinAllowanceFrom(checkIns.filter((c) => c.userId === userId))

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return members
      .filter(
        (m) =>
          m.user.name.toLowerCase().includes(query) ||
          m.user.email.toLowerCase().includes(query) ||
          formatMemberId(m.user.id).toLowerCase().includes(query),
      )
      .slice(0, 6)
  }, [members, q])

  const allowance = selected ? allowanceFor(selected.user.id) : null
  const recent = pinUnlocks.slice(0, 4)

  async function openWindow(override: boolean) {
    if (!selected) return
    setBusy(true)
    try {
      await openPinUnlock(selected.user.id, override)
      showToast(`Keypad open for ${selected.user.name} — 3 tries, 5 minutes.`)
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open the keypad.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Lock className="h-4 w-4" />}
      title="Backup entry"
      description="For a member without their phone. Find them first — the keypad only ever accepts the PIN of the person you pick."
      size="lg"
      footer={
        selected ? (
          <>
            <Button variant="quiet" onClick={() => setSelected(null)} disabled={busy}>
              Back
            </Button>
            <Button
              variant={allowance?.overLimit ? 'ember' : 'solid'}
              loading={busy}
              onClick={() => openWindow(!!allowance?.overLimit)}
              iconLeft={<KeyRound className="h-3.5 w-3.5" />}
            >
              {allowance?.overLimit ? 'Override & open keypad' : 'Open keypad'}
            </Button>
          </>
        ) : undefined
      }
    >
      {selected ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-[10px] border border-line bg-raised p-3">
            <Avatar name={selected.user.name} tone={selected.user.avatarColor} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-ink">{selected.user.name}</p>
              <p className="font-mono truncate text-[11px] text-mute">
                {formatMemberId(selected.user.id)} · {selected.plan.name}
              </p>
            </div>
            <StatusPill membership={selected.membership} size="sm" />
          </div>

          {allowance && (
            <div
              className={`rounded-[10px] border p-3.5 ${
                allowance.overLimit ? 'border-warnsoft bg-warnsoft/40' : 'border-line bg-sunk'
              }`}
            >
              <p className="flex items-center justify-between text-[12px] font-semibold text-ink">
                <span>Backup entries used</span>
                <span className="font-mono tnum">
                  {allowance.used} / {allowance.limit}
                </span>
              </p>
              <p className={`mt-1.5 text-[11.5px] leading-snug ${allowance.overLimit ? 'text-warn' : 'text-dim'}`}>
                {allowance.overLimit
                  ? `Already used ${allowance.used} in the last ${allowance.windowDays} days. Opening this anyway is an override, and it'll be logged against your name — check photo ID first.`
                  : `${allowance.remaining} left in the last ${allowance.windowDays} days. The PIN is the spare key, not the front door.`}
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-dim">
            <li>· The keypad opens on the reader for 5 minutes.</li>
            <li>· Three wrong digits and it closes itself.</li>
            <li>· Let them type it — nobody needs to say a PIN out loud.</li>
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search name, member ID or email"
              aria-label="Find the member"
              className="h-11 w-full rounded-[8px] border border-line bg-sunk pl-9 pr-3 text-[13px] text-ink placeholder:text-mute transition-colors focus:border-volt focus:outline-none"
            />
          </div>

          {q.trim() === '' ? (
            <p className="py-6 text-center text-[12px] text-mute">
              Start typing to find the member standing in front of you.
            </p>
          ) : matches.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-mute">No member matches “{q.trim()}”.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {matches.map((m) => {
                const a = allowanceFor(m.user.id)
                return (
                  <li key={m.user.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(m)}
                      className="flex w-full items-center gap-3 rounded-[9px] border border-line bg-sunk p-2.5 text-left transition-colors hover:border-voltline"
                    >
                      <Avatar name={m.user.name} tone={m.user.avatarColor} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{m.user.name}</span>
                        <span className="font-mono block truncate text-[10.5px] text-mute">
                          {formatMemberId(m.user.id)} · {m.membership.homeLocation}
                        </span>
                      </span>
                      <Badge tone={a.overLimit ? 'warn' : 'slate'} size="sm">
                        {a.used}/{a.limit}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {recent.length > 0 && (
            <div className="border-t border-linesoft pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">Recent backup entries</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {recent.map((u) => (
                  <RecentUnlockRow key={u.id} unlock={u} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

const UNLOCK_STATUS_LABEL: Record<PinUnlock['status'], string> = {
  open: 'open',
  used: 'checked in',
  locked: '3 wrong tries',
  expired: 'timed out',
  cancelled: 'cancelled',
}

function RecentUnlockRow({ unlock }: { unlock: PinUnlock }) {
  const { members } = useAdminData()
  const member = members.find((m) => m.user.id === unlock.userId)
  return (
    <li className="flex items-center gap-2 text-[11.5px]">
      <span className="min-w-0 flex-1 truncate text-dim">{member?.user.name ?? unlock.userId}</span>
      {unlock.override && (
        <Badge tone="warn" size="sm">
          override
        </Badge>
      )}
      <span className="shrink-0 text-mute">{UNLOCK_STATUS_LABEL[unlock.status]}</span>
      <span className="shrink-0 text-mute">{relativeTime(unlock.openedAt)}</span>
    </li>
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
