import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Dices,
  Eye,
  EyeOff,
  KeyRound,
  Maximize2,
  Pencil,
  ShieldCheck,
  Snowflake,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { useLanguage, type TranslationKey } from '@/context/LanguageContext'
import { PageLoader } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { OtpInput } from '@/components/ui/OtpInput'
import { Tabs } from '@/components/ui/Tabs'
import { QrCode } from '@/components/ui/QrCode'
import { formatMemberId } from '@/lib/format'
import { displayStatus, type MemberDisplayStatus } from '@/lib/access'
import { ROTATE_SECONDS, currentWindowStart, secondsUntilRotation } from '@/lib/accessToken'
import { isWeakPin } from '@/lib/pinPolicy'
import { fetchCheckInToken, listCheckIns } from '@/lib/db'
import type { CheckIn } from '@/types'

/** How long the "you're in" confirmation stays up before the code returns. */
const CHECKIN_CONFIRM_MS = 3500
/** How often this polls its own check-in history, looking for a new one. */
const CHECKIN_POLL_MS = 3000

const STATUS_NOTE_KEY: Record<MemberDisplayStatus, TranslationKey | null> = {
  active: null,
  expiring: null,
  frozen: 'checkin.frozenNote',
  expired: 'checkin.expiredNote',
  cancelled: 'checkin.cancelledNote',
}

export function CheckInPage() {
  const { user } = useAuth()
  const { loading, membership, currentPlan } = useGymData()
  const { t } = useLanguage()

  const [fullscreen, setFullscreen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilRotation())
  const [justCheckedIn, setJustCheckedIn] = useState<CheckIn | null>(null)
  const seenCheckInId = useRef<string | null>(null)
  const confirmTimer = useRef<number | undefined>(undefined)

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
          setTokenError(err instanceof Error ? err.message : t('checkin.couldNotReach'))
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
  }, [user, t])

  // The reader grants access from the front desk, not from this screen —
  // this page has no way to know a scan succeeded except to ask whether a
  // new row has landed in its own check-in history since it last looked.
  // The first read only seeds what "new" means; it never fires the
  // confirmation for a check-in that was already there before the page
  // opened. Paused while the tab is hidden — a phone in a pocket has no
  // reason to keep polling.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    let seeded = false

    async function poll() {
      if (document.hidden) return
      try {
        const rows = await listCheckIns()
        if (cancelled) return
        const latest = rows[0]
        if (!seeded) {
          seenCheckInId.current = latest?.id ?? null
          seeded = true
          return
        }
        if (latest && latest.id !== seenCheckInId.current) {
          seenCheckInId.current = latest.id
          window.clearTimeout(confirmTimer.current)
          setJustCheckedIn(latest)
          confirmTimer.current = window.setTimeout(() => {
            setJustCheckedIn(null)
            setFullscreen(false)
          }, CHECKIN_CONFIRM_MS)
        }
      } catch {
        // A missed poll just tries again next tick — nothing to surface.
      }
    }

    poll()
    const id = window.setInterval(poll, CHECKIN_POLL_MS)
    document.addEventListener('visibilitychange', poll)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [user])

  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  if (loading || !user || !membership || !currentPlan) return <PageLoader label={t('checkin.loading')} />

  const memberId = formatMemberId(user.id)
  const status = displayStatus(membership)
  const statusNoteKey = STATUS_NOTE_KEY[status]
  const ringCircumference = 2 * Math.PI * 13
  const ok = status === 'active' || status === 'expiring'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <PageHeader
        title={t('checkin.title')}
        subtitle={t('checkin.subtitle', { seconds: ROTATE_SECONDS })}
      />

      {statusNoteKey && (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-badsoft bg-badsoft px-4 py-3 text-[12.5px] leading-snug text-bad">
          {status === 'frozen' ? (
            <Snowflake className="mt-px h-4 w-4 shrink-0" />
          ) : (
            <TriangleAlert className="mt-px h-4 w-4 shrink-0" />
          )}
          <span>{t(statusNoteKey)}</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="hazard h-1 opacity-90" />
        <CardBody className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-bold leading-none text-ink">{user.name}</p>
              <Badge tone={ok ? 'good' : 'bad'} size="sm">
                {ok ? t('checkin.active') : status}
              </Badge>
            </div>
            <p className="text-[10.5px] uppercase tracking-[.14em] text-mute">
              {currentPlan.name} · {membership.homeLocation}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            disabled={!token || !!justCheckedIn}
            className="group relative rounded-[14px] shadow-lift transition-transform active:scale-[0.985] disabled:opacity-100"
            aria-label={t('checkin.showFullscreenAria')}
          >
            {justCheckedIn ? (
              <CheckedInCard checkIn={justCheckedIn} />
            ) : token ? (
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
            {!justCheckedIn && (
              <span className="pointer-events-none absolute bottom-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-3.5 w-3.5" />
              </span>
            )}
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
            <p className="text-[11.5px] text-mute">{t('checkin.newCodeIn', { seconds: secondsLeft })}</p>
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
          aria-label={t('checkin.fullscreenAria')}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label={t('checkin.close')}
          >
            <X className="h-5 w-5" />
          </button>
          {justCheckedIn ? (
            <div className="a-pop text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-good text-voltink">
                <Check className="h-12 w-12" strokeWidth={3.4} />
              </div>
              <h2 className="font-display mt-5 text-[30px] font-extrabold uppercase leading-none tracking-[-.01em] text-good">
                {t('checkin.youreIn')}
              </h2>
              <p className="mt-2 text-[13px] text-white/70">{justCheckedIn.location}</p>
            </div>
          ) : (
            <>
              <QrCode value={token} size={Math.min(320, window.innerWidth - 96)} />
              <div className="text-center">
                <p className="font-mono tnum text-[13px] text-white/70">{t('checkin.newCodeInShort', { seconds: secondsLeft })}</p>
                <p className="mt-1 text-[12px] text-white/50">{t('checkin.tapAnywhereToClose')}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Sits exactly where the QR normally does, same footprint, so nothing on
 * the page shifts when a scan lands — it just replaces the code with the
 * result for a few seconds. Same good/check visual language as the front
 * desk's own "Access granted" screen (ScannerPage), scaled down to a card
 * a member holds, not a kiosk a stranger reads.
 */
function CheckedInCard({ checkIn }: { checkIn: CheckIn }) {
  const { t } = useLanguage()
  return (
    <div
      className="a-pop grid h-[236px] w-[236px] place-items-center rounded-[10px] p-4 text-center"
      style={{ backgroundColor: 'var(--good-soft)' }}
    >
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-good text-voltink">
          <Check className="h-7 w-7" strokeWidth={3.4} />
        </div>
        <p className="font-display mt-3 text-[16px] font-extrabold uppercase tracking-[-.01em] text-good">
          {t('checkin.youreIn')}
        </p>
        <p className="mt-1 text-[11.5px] text-dim">{checkIn.location}</p>
      </div>
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
  const { user } = useAuth()
  const { pinAllowance } = useGymData()
  const { t } = useLanguage()

  const [expanded, setExpanded] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

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
          <span className="block text-[13px] font-semibold text-ink">{t('checkin.backupPinTitle')}</span>
          <span className="block text-[11.5px] text-mute">
            {t('checkin.backupPinRemaining', { remaining: pinAllowance.remaining, limit: pinAllowance.limit })}
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
            <span>{t('checkin.pinExplain')}</span>
          </div>

          <div className="flex items-center justify-between rounded-[9px] bg-raised px-4 py-3">
            <span className="font-mono text-[24px] font-bold leading-none tracking-[0.3em] text-ink">
              {revealed ? pin : '••••'}
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="-mr-1 rounded-[7px] p-2 text-dim transition-colors hover:bg-line hover:text-ink"
              aria-label={revealed ? t('checkin.hidePin') : t('checkin.showPin')}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {pinAllowance.overLimit ? (
            <p className="text-[11.5px] leading-snug text-warn">
              {t('checkin.overLimitNote', { limit: pinAllowance.limit, days: pinAllowance.windowDays })}
            </p>
          ) : (
            <p className="text-[11.5px] leading-snug text-mute">
              {t('checkin.underLimitNote', { limit: pinAllowance.limit, days: pinAllowance.windowDays })}
            </p>
          )}

          <Button
            variant="quiet"
            size="sm"
            className="self-start"
            onClick={() => setDialogOpen(true)}
            iconLeft={<Pencil className="h-3.5 w-3.5" />}
          >
            {t('checkin.changePin')}
          </Button>
        </div>
      )}

      <SetPinDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setRevealed(true)}
      />
    </Card>
  )
}

/**
 * Where the member actually decides the PIN — not a bare "are you sure",
 * because the two things worth being clear about are exactly the two this
 * dialog leads with: how often it works, and who can even try it. The pick
 * itself can go either way: type your own four digits, or let the server
 * choose ones that aren't a lucky first guess.
 */
function SetPinDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (pin: string) => void
}) {
  const { setCheckInPin } = useAuth()
  const { pinAllowance } = useGymData()
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'custom' | 'random'>('custom')
  const [digits, setDigits] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset every time it's reopened, not just on the way in — otherwise a
  // cancelled attempt's half-typed digits (or its error line) are still
  // sitting there the next time this member opens it.
  useEffect(() => {
    if (open) {
      setMode('custom')
      setDigits('')
      setFormError(null)
    }
  }, [open])

  const canSave = mode === 'random' || digits.length === 4

  async function handleSave() {
    if (mode === 'custom' && isWeakPin(digits)) {
      setFormError(t('checkin.weakPinError'))
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const applied = await setCheckInPin(mode === 'custom' ? digits : undefined)
      showToast(t('checkin.newPinToast', { pin: applied }))
      onSaved(applied)
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('checkin.savePinError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<KeyRound className="h-4 w-4" />}
      title={t('checkin.changePinDialogTitle')}
      description={t('checkin.changePinDialogDesc', { limit: pinAllowance.limit, days: pinAllowance.windowDays })}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            {t('checkin.savePin')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          items={[
            { key: 'custom', label: t('checkin.chooseMyOwn') },
            { key: 'random', label: t('checkin.generateForMe') },
          ]}
          active={mode}
          onChange={(key) => {
            setMode(key as 'custom' | 'random')
            setFormError(null)
            if (key === 'random') setDigits('')
          }}
        />

        {mode === 'custom' ? (
          <div>
            <OtpInput
              length={4}
              value={digits}
              onChange={(v) => {
                setDigits(v)
                setFormError(null)
              }}
              error={!!formError}
              disabled={saving}
            />
            <p className="mt-2.5 text-[11.5px] leading-snug text-mute">{t('checkin.pinHelperText')}</p>
          </div>
        ) : (
          <p className="rounded-[9px] border border-line bg-raised px-3.5 py-3 text-[12.5px] leading-snug text-dim">
            <Dices className="mb-1.5 h-4 w-4 text-volt" />
            <br />
            {t('checkin.randomHelperText')}
          </p>
        )}

        {formError && <p className="text-[12px] leading-snug text-bad">{formError}</p>}
      </div>
    </Modal>
  )
}
