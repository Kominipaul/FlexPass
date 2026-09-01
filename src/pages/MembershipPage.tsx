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
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
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
  const { loading, membership, currentPlan, setAutoRenew, freezeMembership, unfreezeMembership, cancelMembership, reactivateMembership } =
    useGymData()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [freezeOpen, setFreezeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [unfreezeOpen, setUnfreezeOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Membership</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your plan, billing cycle and membership status.</p>
        </div>
        <Button onClick={() => navigate('/membership/upgrade')} iconLeft={<Sparkles className="h-4 w-4" />}>
          Change plan
        </Button>
      </div>

      <StatusBanner status={membership.status} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${TONES[toneOf(currentPlan.color)].dot}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-ink-900">{currentPlan.name} plan</h3>
                    <Badge tone={toneOf(currentPlan.color)}>{membership.billingCycle}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{currentPlan.tagline}</p>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-ink-900">
                {formatCurrency(membership.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly)}
                <span className="text-sm font-medium text-slate-400">
                  /{membership.billingCycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentPlan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-ink-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-600" />
                  {perk}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
              <MetaStat icon={<Calendar className="h-4 w-4" />} label="Member since" value={formatDate(membership.startDate)} />
              <MetaStat
                icon={<Calendar className="h-4 w-4" />}
                label={daysLeft >= 0 ? 'Renews' : 'Renewal was'}
                value={formatDate(membership.renewalDate)}
              />
              <MetaStat icon={<Building2 className="h-4 w-4" />} label="Home location" value={membership.homeLocation} />
              <MetaStat
                icon={<History className="h-4 w-4" />}
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
            <div className="h-px bg-slate-100" />
            <div className="flex flex-col gap-2.5">
              {membership.status === 'frozen' ? (
                <Button variant="outline" onClick={() => setUnfreezeOpen(true)} iconLeft={<RefreshCcw className="h-4 w-4" />}>
                  Unfreeze membership
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={membership.status !== 'active'}
                  onClick={() => setFreezeOpen(true)}
                  iconLeft={<Snowflake className="h-4 w-4" />}
                >
                  Freeze membership
                </Button>
              )}

              {membership.status === 'cancelled' || membership.status === 'pending_cancellation' ? (
                <Button onClick={() => setReactivateOpen(true)} iconLeft={<RefreshCcw className="h-4 w-4" />}>
                  Reactivate membership
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => setCancelOpen(true)}
                  iconLeft={<XCircle className="h-4 w-4" />}
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
            <ul className="flex flex-col divide-y divide-slate-100">
              {membership.freezeHistory.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="font-medium text-ink-800">
                    {formatDate(f.startDate)} – {formatDate(f.endDate)}
                  </span>
                  <Badge tone="cyan">{f.reason}</Badge>
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

      <ConfirmDialog
        open={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        title="Reactivate membership?"
        description="Your plan will resume billing on its next cycle."
        confirmLabel="Reactivate"
        onConfirm={async () => {
          try {
            await reactivateMembership()
            showToast('Membership reactivated. Welcome back!')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not reactivate membership.', 'error')
          } finally {
            setReactivateOpen(false)
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
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-ink-900">{value}</p>
    </div>
  )
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'active') return null
  const copy: Record<string, { text: string; tone: string }> = {
    frozen: { text: 'This membership is frozen. Billing is paused until you unfreeze it.', tone: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
    pending_cancellation: {
      text: 'This membership is set to cancel and will not renew.',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    cancelled: { text: 'This membership is cancelled.', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
  }
  const entry = copy[status]
  if (!entry) return null
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${entry.tone}`}>
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
      title="Freeze your membership"
      description="Pause billing and access for a set period."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={handleSubmit}>
            Freeze membership
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
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
      title="Cancel membership"
      description="We're sorry to see you go. Choose how you'd like to cancel."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
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
      className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-colors ${
        selected ? 'border-brand-500 bg-brand-50/60' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  )
}
