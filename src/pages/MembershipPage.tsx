import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  History,
  RefreshCcw,
  Snowflake,
  Store,
  XCircle,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { daysUntil, formatCurrency, formatDate, isoDateOnly } from '@/lib/format'
import { TONES, toneOf } from '@/lib/colors'

const FREEZE_REASONS = ['Travel', 'Injury / medical', 'Financial', 'Moving', 'Other']

export function MembershipPage() {
  const { loading, membership, currentPlan, setAutoRenew, freezeMembership, unfreezeMembership, cancelMembership } =
    useGymData()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [freezeOpen, setFreezeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [unfreezeOpen, setUnfreezeOpen] = useState(false)

  if (loading || !membership || !currentPlan) return <PageLoader label="Loading your membership…" />

  const daysLeft = daysUntil(membership.renewalDate)

  async function handleAutoRenewToggle(next: boolean) {
    try {
      await setAutoRenew(next)
      showToast(next ? 'Auto-renew turned on.' : 'Auto-renew turned off.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update auto-renew.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Membership"
        subtitle="Manage your billing cycle and membership status."
        action={
          <Button variant="quiet" onClick={() => navigate('/membership/upgrade')} iconLeft={<Store className="h-3.5 w-3.5" />}>
            Compare plans
          </Button>
        }
      />

      <StatusBanner status={membership.status} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="hazard h-1 opacity-90" />
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${TONES[toneOf(currentPlan.color)].dot}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[17px] font-bold uppercase tracking-[.03em] text-ink">
                      {currentPlan.name} plan
                    </h3>
                    <Badge tone={toneOf(currentPlan.color)}>{membership.billingCycle}</Badge>
                  </div>
                  <p className="text-[12.5px] text-dim">{currentPlan.tagline}</p>
                </div>
              </div>
              <p className="font-display tnum text-[24px] font-extrabold text-ink">
                {formatCurrency(membership.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly)}
                <span className="text-[12.5px] font-medium text-mute">
                  /{membership.billingCycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentPlan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[12.5px] text-dim">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" strokeWidth={2.5} />
                  {perk}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-4 border-t border-linesoft pt-5 sm:grid-cols-4">
              <MetaStat icon={<Calendar className="h-3.5 w-3.5" />} label="Member since" value={formatDate(membership.startDate)} />
              <MetaStat
                icon={<Calendar className="h-3.5 w-3.5" />}
                label={daysLeft >= 0 ? 'Renews' : 'Renewal was'}
                value={formatDate(membership.renewalDate)}
              />
              <MetaStat icon={<Building2 className="h-3.5 w-3.5" />} label="Home location" value={membership.homeLocation} />
              <MetaStat
                icon={<History className="h-3.5 w-3.5" />}
                label="Days left"
                value={`${Math.max(daysLeft, 0)} days`}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-5">
            <Switch
              checked={membership.autoRenew}
              onChange={handleAutoRenewToggle}
              disabled={membership.status !== 'active'}
              label="Auto-renew"
              description={membership.autoRenew ? 'Your plan renews automatically.' : 'Your plan will not renew automatically.'}
            />
            <div className="h-px bg-linesoft" />
            <div className="flex flex-col gap-2.5">
              {membership.status === 'frozen' ? (
                <Button variant="quiet" onClick={() => setUnfreezeOpen(true)} iconLeft={<RefreshCcw className="h-3.5 w-3.5" />}>
                  Unfreeze membership
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  disabled={membership.status !== 'active'}
                  onClick={() => setFreezeOpen(true)}
                  iconLeft={<Snowflake className="h-3.5 w-3.5" />}
                >
                  Freeze membership
                </Button>
              )}

              {membership.status === 'cancelled' || membership.status === 'pending_cancellation' ? (
                <p className="flex items-start gap-2 rounded-[9px] border border-line bg-raised p-3 text-[12px] text-dim">
                  <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mute" />
                  Reactivating goes through the front desk — we don't take payment online yet.
                </p>
              ) : (
                <Button
                  variant="ghost"
                  className="text-bad hover:bg-badsoft"
                  onClick={() => setCancelOpen(true)}
                  iconLeft={<XCircle className="h-3.5 w-3.5" />}
                >
                  Cancel membership
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {membership.freezeHistory.length > 0 && (
        <Card>
          <CardHeader icon={<History className="h-4 w-4" />} title="Freeze history" />
          <CardBody>
            <ul className="flex flex-col divide-y divide-linesoft">
              {membership.freezeHistory.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[12.5px] first:pt-0 last:pb-0">
                  <span className="font-medium text-ink">
                    {formatDate(f.startDate)} – {formatDate(f.endDate)}
                  </span>
                  <Badge tone="froze">{f.reason}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <FreezeModal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        onSubmit={async (record) => {
          try {
            await freezeMembership(record)
            showToast('Membership frozen.')
            setFreezeOpen(false)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not freeze membership.', 'error')
          }
        }}
      />

      <ConfirmDialog
        open={unfreezeOpen}
        onClose={() => setUnfreezeOpen(false)}
        title="Unfreeze membership?"
        description="Billing and access will resume immediately."
        confirmLabel="Unfreeze"
        onConfirm={async () => {
          try {
            await unfreezeMembership()
            showToast('Membership unfrozen.')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not unfreeze membership.', 'error')
          } finally {
            setUnfreezeOpen(false)
          }
        }}
      />

      <CancelMembershipModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        renewalDate={membership.renewalDate}
        onSubmit={async (immediate) => {
          try {
            await cancelMembership(immediate)
            showToast('Membership cancellation scheduled.')
            setCancelOpen(false)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not cancel membership.', 'error')
          }
        }}
      />
    </div>
  )
}

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[13px] font-bold text-ink">{value}</p>
    </div>
  )
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'active') return null
  const copy: Record<string, { text: string; tone: string }> = {
    frozen: { text: 'This membership is frozen. Billing is paused until you unfreeze it.', tone: 'border-frozesoft bg-frozesoft text-froze' },
    pending_cancellation: {
      text: 'This membership is set to cancel and will not renew.',
      tone: 'border-warnsoft bg-warnsoft text-warn',
    },
    cancelled: { text: 'This membership is cancelled.', tone: 'border-badsoft bg-badsoft text-bad' },
  }
  const entry = copy[status]
  if (!entry) return null
  return (
    <div className={`flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-[13px] ${entry.tone}`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {entry.text}
    </div>
  )
}

function FreezeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (record: { startDate: string; endDate: string; reason: string }) => Promise<void>
}) {
  const today = isoDateOnly(new Date())
  const defaultEnd = isoDateOnly(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [reason, setReason] = useState(FREEZE_REASONS[0])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after the start date.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), reason })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Snowflake className="h-4 w-4" />}
      title="Freeze your membership"
      description="Pause billing and access for a set period."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            Freeze membership
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-[12.5px] font-medium text-bad">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={today} />
          <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
        </div>
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {FREEZE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}

function CancelMembershipModal({
  open,
  onClose,
  onSubmit,
  renewalDate,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (immediate: boolean) => Promise<void>
  renewalDate: string
}) {
  const [choice, setChoice] = useState<'end_of_cycle' | 'immediate'>('end_of_cycle')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onSubmit(choice === 'immediate')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<XCircle className="h-4 w-4" />}
      title="Cancel membership"
      description="We're sorry to see you go. Choose how you'd like to cancel."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Never mind
          </Button>
          <Button variant="danger" loading={submitting} onClick={handleSubmit}>
            Confirm cancellation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CancelOption
          selected={choice === 'end_of_cycle'}
          onSelect={() => setChoice('end_of_cycle')}
          title="Cancel at end of billing period"
          description={`Keep access until ${formatDate(renewalDate)}, then your membership ends.`}
        />
        <CancelOption
          selected={choice === 'immediate'}
          onSelect={() => setChoice('immediate')}
          title="Cancel immediately"
          description="Lose access right away. No further charges."
        />
        <Textarea label="Tell us why (optional)" placeholder="Help us improve…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

function CancelOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-[9px] border-2 p-3.5 text-left transition-colors ${
        selected ? 'border-volt bg-voltsoft/40' : 'border-line hover:border-voltline'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-volt bg-volt' : 'border-line'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-voltink" />}
      </span>
      <span>
        <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
        <span className="block text-[11.5px] text-mute">{description}</span>
      </span>
    </button>
  )
}
