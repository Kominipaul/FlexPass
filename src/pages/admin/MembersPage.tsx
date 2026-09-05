import { useMemo, useState } from 'react'
import { CalendarPlus, Play, RefreshCcw, Search, Snowflake, Sparkles, UserX } from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/admin/StatusPill'
import { BillingCycleToggle } from '@/components/BillingCycleToggle'
import { displayStatus, evaluateAccess, reasonText, type MemberDisplayStatus } from '@/lib/access'
import { daysUntil, formatCurrency, formatDate, formatDateTime, formatMemberId } from '@/lib/format'
import type { AdminMemberRow, ReactivateSnapshot } from '@/lib/db'
import type { BillingCycle, CheckIn, Plan } from '@/types'

function isReactivatable(status: AdminMemberRow['membership']['status']) {
  return status === 'cancelled' || status === 'pending_cancellation'
}

const inputCls =
  'h-10 w-full rounded-[6px] border border-line bg-sunk pl-9 pr-3 text-[13px] text-ink placeholder:text-mute transition-colors focus:border-volt focus:outline-none'

function mostRecentCheckIn(checkIns: CheckIn[], userId: string): CheckIn | undefined {
  return checkIns
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
}

export function MembersPage() {
  const {
    loading, members, locations, plans, checkIns, atLocationId,
    extendMembership, setFrozen, changePlan, undoChangePlan, reactivateMembership, undoReactivateMembership,
  } = useAdminData()
  const { showToast } = useToast()

  const [q, setQ] = useState('')
  const [locFilter, setLocFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | MemberDisplayStatus>('all')
  const [extendFor, setExtendFor] = useState<AdminMemberRow | null>(null)
  const [planFor, setPlanFor] = useState<AdminMemberRow | null>(null)
  const [detailFor, setDetailFor] = useState<AdminMemberRow | null>(null)

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return members.filter((m) => {
      const matchesQuery =
        !query ||
        m.user.name.toLowerCase().includes(query) ||
        m.user.email.toLowerCase().includes(query) ||
        formatMemberId(m.user.id).toLowerCase().includes(query)
      const matchesLoc = locFilter === 'all' || m.membership.homeLocation === locations.find((l) => l.id === locFilter)?.name
      const matchesStatus = statusFilter === 'all' || displayStatus(m.membership) === statusFilter
      return matchesQuery && matchesLoc && matchesStatus
    })
  }, [members, q, locFilter, statusFilter, locations])

  if (loading) return <PageLoader label="Loading members…" />

  async function handleToggleFreeze(row: AdminMemberRow) {
    const frozen = row.membership.status !== 'frozen'
    try {
      await setFrozen(row.user.id, frozen)
      showToast(`${row.user.name} is now ${frozen ? 'frozen' : 'active'}.`, 'success', {
        label: 'Undo',
        onClick: () => {
          setFrozen(row.user.id, !frozen).catch(() =>
            showToast('Could not undo — try it from the row instead.', 'error'),
          )
        },
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update membership.', 'error')
    }
  }

  async function handleReactivate(row: AdminMemberRow) {
    // Captured before the call, so Undo can put back exactly what was
    // there — not just flip status, but the renewal date and auto-renew
    // flag reactivate overwrites too.
    const before: ReactivateSnapshot = {
      status: row.membership.status,
      autoRenew: row.membership.autoRenew,
      renewalDate: row.membership.renewalDate,
    }
    try {
      await reactivateMembership(row.user.id)
      showToast(`${row.user.name}'s membership is active again.`, 'success', {
        label: 'Undo',
        onClick: () => {
          undoReactivateMembership(row.user.id, before).catch(() =>
            showToast('Could not undo the reactivation — check the member\'s status.', 'error'),
          )
        },
      })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not reactivate membership.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Members</h2>
        <p className="mt-1 text-[13px] text-dim">{members.length} members across all locations.</p>
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-linesoft p-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, member ID or email"
              className={inputCls}
              aria-label="Search members"
            />
          </div>
          <div className="flex gap-2">
            <div className="w-44">
              <Select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} aria-label="Filter by location">
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | MemberDisplayStatus)}
                aria-label="Filter by status"
              >
                <option value="all">Any status</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
                <option value="expired">Expired</option>
                <option value="frozen">Frozen</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-raised">
              <tr>
                {['Member', 'Location', 'Plan', 'Status', 'Days left', 'Last check-in', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[.08em] text-mute">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const daysLeft = daysUntil(row.membership.renewalDate)
                const last = mostRecentCheckIn(checkIns, row.user.id)
                const frozen = row.membership.status === 'frozen'
                return (
                  <tr key={row.user.id} className="border-t border-linesoft transition-colors hover:bg-raised">
                    <td className="px-3 py-2.5">
                      <button onClick={() => setDetailFor(row)} className="group flex items-center gap-2.5 text-left">
                        <Avatar name={row.user.name} tone={row.user.avatarColor} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink group-hover:text-volt">
                            {row.user.name}
                          </span>
                          <span className="font-mono block text-[11px] text-mute">{formatMemberId(row.user.id)}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-dim">{row.membership.homeLocation}</td>
                    <td className="px-3 py-2.5 text-[12px] text-ink">{row.plan.name}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill membership={row.membership} size="sm" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono text-[13px] ${daysLeft <= 7 ? 'font-semibold text-warn' : 'text-ink'}`}>
                        {daysLeft}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-dim">
                      {last ? formatDateTime(last.timestamp) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="quiet" iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={() => setPlanFor(row)}>
                          Plan
                        </Button>
                        <Button size="sm" variant="quiet" iconLeft={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setExtendFor(row)}>
                          Extend
                        </Button>
                        {isReactivatable(row.membership.status) ? (
                          <Button
                            size="sm"
                            variant="good"
                            className="w-[112px]"
                            iconLeft={<RefreshCcw className="h-3.5 w-3.5" />}
                            onClick={() => handleReactivate(row)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant={frozen ? 'good' : 'ghost'}
                            className="w-[112px]"
                            iconLeft={frozen ? <Play className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                            onClick={() => handleToggleFreeze(row)}
                          >
                            {frozen ? 'Unfreeze' : 'Freeze'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <EmptyState icon={<UserX className="h-5 w-5" />} title="No members match" description="Clear a filter or try another search." />
        )}

        <div className="flex items-center justify-between border-t border-linesoft px-3 py-2 text-[11px] text-dim">
          <span>
            {rows.length} of {members.length} members
          </span>
          <span className="font-mono">
            {locations.map((l) => `${l.id === 'downtown' ? 'DT' : 'NS'} ${members.filter((m) => m.membership.homeLocation === l.name).length}`).join('   ·   ')}
          </span>
        </div>
      </Card>

      <ExtendModal
        row={extendFor}
        onClose={() => setExtendFor(null)}
        onSubmit={async (days) => {
          if (!extendFor) return
          const { user } = extendFor
          try {
            await extendMembership(user.id, days)
            showToast(
              days > 0 ? `${user.name} extended by ${days} days.` : `Removed ${Math.abs(days)} days from ${user.name}.`,
              'success',
              {
                label: 'Undo',
                onClick: () => {
                  extendMembership(user.id, -days).catch(() =>
                    showToast('Could not undo — adjust it from the row instead.', 'error'),
                  )
                },
              },
            )
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not adjust membership length.', 'error')
          } finally {
            setExtendFor(null)
          }
        }}
      />

      <PlanModal
        row={planFor}
        plans={plans}
        onClose={() => setPlanFor(null)}
        onSubmit={async (planId, billingCycle) => {
          if (!planFor) return
          const { user, plan: previousPlan, membership: previousMembership } = planFor
          const newPlanName = plans.find((p) => p.id === planId)?.name ?? 'new plan'
          try {
            const { invoiceId } = await changePlan(user.id, planId, billingCycle)
            showToast(`${user.name} moved to the ${newPlanName} plan.`, 'success', {
              label: 'Undo',
              onClick: () => {
                undoChangePlan(user.id, previousMembership.planId, previousMembership.billingCycle, invoiceId)
                  .then(() => showToast(`Reverted ${user.name} back to ${previousPlan.name} and refunded the charge.`))
                  .catch(() => showToast('Could not undo — change the plan back manually instead.', 'error'))
              },
            })
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not change plan.', 'error')
          } finally {
            setPlanFor(null)
          }
        }}
      />

      <MemberDetailModal
        row={detailFor}
        onClose={() => setDetailFor(null)}
        atLocationId={atLocationId}
        checkIns={checkIns}
        onExtend={() => {
          const row = detailFor
          setDetailFor(null)
          if (row) setExtendFor(row)
        }}
        onChangePlan={() => {
          const row = detailFor
          setDetailFor(null)
          if (row) setPlanFor(row)
        }}
        onToggleFreeze={async () => {
          if (!detailFor) return
          await handleToggleFreeze(detailFor)
          setDetailFor(null)
        }}
        onReactivate={async () => {
          if (!detailFor) return
          await handleReactivate(detailFor)
          setDetailFor(null)
        }}
      />
    </div>
  )
}

function ExtendModal({
  row,
  onClose,
  onSubmit,
}: {
  row: AdminMemberRow | null
  onClose: () => void
  onSubmit: (days: number) => Promise<void>
}) {
  // `mode` just controls the sign — the API (and undo above) both work off
  // a single signed day count, so a misclicked +30 is corrected the exact
  // same way this modal removes days on purpose.
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  if (!row) return null
  const daysLeft = daysUntil(row.membership.renewalDate)
  const signedDays = mode === 'add' ? amount : -amount
  const preview = daysLeft + signedDays

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      icon={<CalendarPlus className="h-4 w-4" />}
      title={`Adjust membership length · ${row.user.name}`}
      description={`${formatMemberId(row.user.id)} · ${row.plan.name}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={amount <= 0}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true)
              try {
                await onSubmit(signedDays)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {mode === 'add' ? `Add ${amount} days` : `Remove ${amount} days`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`rounded-[9px] border py-2 text-center text-[12.5px] font-semibold transition-colors ${
              mode === 'add' ? 'border-volt bg-voltsoft text-volt' : 'border-line text-dim hover:text-ink'
            }`}
          >
            Add days
          </button>
          <button
            type="button"
            onClick={() => setMode('remove')}
            className={`rounded-[9px] border py-2 text-center text-[12.5px] font-semibold transition-colors ${
              mode === 'remove' ? 'border-bad bg-badsoft text-bad' : 'border-line text-dim hover:text-ink'
            }`}
          >
            Remove days — undo a misclick
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setAmount(d)}
              className={`rounded-[9px] border py-2.5 text-center transition-colors ${
                amount === d
                  ? mode === 'add'
                    ? 'border-volt bg-voltsoft text-volt'
                    : 'border-bad bg-badsoft text-bad'
                  : 'border-line text-dim hover:text-ink'
              }`}
            >
              <span className="font-display block text-[16px] font-extrabold">
                {mode === 'add' ? '+' : '−'}
                {d}
              </span>
              <span className="text-[10.5px]">{d === 365 ? 'one year' : 'days'}</span>
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 rounded-[9px] border border-line px-3 py-2 text-[12px]">
          <span className="text-dim">Or an exact number of days</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="w-20 rounded-[6px] border border-line bg-sunk px-2 py-1 text-right font-mono text-[13px] text-ink focus:border-volt focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between rounded-[9px] border border-line bg-raised p-3 text-[12px]">
          <span className="text-dim">Days remaining after this change</span>
          <span className={`font-mono text-[14px] font-semibold ${preview < 0 ? 'text-bad' : 'text-ink'}`}>
            {daysLeft} → {preview}
          </span>
        </div>

        {mode === 'add' && row.membership.status === 'cancelled' && (
          <p className="flex items-start gap-2 text-[12px] text-froze">
            <Snowflake className="mt-0.5 h-3.5 w-3.5" />
            Adding days also reactivates this cancelled membership. Removing days never does.
          </p>
        )}
      </div>
    </Modal>
  )
}

function PlanModal({
  row,
  plans,
  onClose,
  onSubmit,
}: {
  row: AdminMemberRow | null
  plans: Plan[]
  onClose: () => void
  onSubmit: (planId: string, billingCycle: BillingCycle) => Promise<void>
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [planId, setPlanId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (!row) return null

  const activePlanId = planId || row.plan.id
  const activeCycle = planId ? billingCycle : row.membership.billingCycle
  const isUnchanged = activePlanId === row.membership.planId && activeCycle === row.membership.billingCycle

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      icon={<Sparkles className="h-4 w-4" />}
      title={`Change plan · ${row.user.name}`}
      description={`${formatMemberId(row.user.id)} · currently ${row.plan.name}, billed ${row.membership.billingCycle}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isUnchanged}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true)
              try {
                await onSubmit(activePlanId, activeCycle)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {isUnchanged ? 'No change' : 'Confirm — payment taken in person'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 rounded-[9px] border border-line bg-raised p-3 text-[12px] text-dim">
          Only use this after collecting payment at the desk — it records the plan
          change and invoices it as paid immediately.
        </p>
        <BillingCycleToggle value={activeCycle} onChange={(c) => { setBillingCycle(c); setPlanId(activePlanId) }} />
        <Select
          label="Plan"
          value={activePlanId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatCurrency(activeCycle === 'yearly' ? p.priceYearly : p.priceMonthly)}/
              {activeCycle === 'yearly' ? 'yr' : 'mo'}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  )
}

function MemberDetailModal({
  row,
  onClose,
  atLocationId,
  checkIns,
  onExtend,
  onChangePlan,
  onToggleFreeze,
  onReactivate,
}: {
  row: AdminMemberRow | null
  onClose: () => void
  atLocationId: string
  checkIns: CheckIn[]
  onExtend: () => void
  onChangePlan: () => void
  onToggleFreeze: () => Promise<void>
  onReactivate: () => Promise<void>
}) {
  if (!row) return null
  const daysLeft = daysUntil(row.membership.renewalDate)
  const visits = checkIns.filter((c) => c.userId === row.user.id).length
  const last = mostRecentCheckIn(checkIns, row.user.id)
  const access = evaluateAccess(row.membership, row.plan, atLocationId)
  const frozen = row.membership.status === 'frozen'

  const fields: [string, string][] = [
    ['Plan', row.plan.name],
    ['Home location', row.membership.homeLocation],
    ['Days left', `${Math.max(daysLeft, 0)} days`],
    ['Lifetime visits', String(visits)],
    ['Member since', formatDate(row.user.memberSince)],
    ['Last check-in', last ? formatDateTime(last.timestamp) : 'Never'],
  ]

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      icon={<UserX className="h-4 w-4" />}
      title={row.user.name}
      description={row.user.email}
      footer={
        <>
          <Button variant="quiet" iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={onChangePlan}>
            Change plan
          </Button>
          {isReactivatable(row.membership.status) ? (
            <Button variant="good" iconLeft={<RefreshCcw className="h-3.5 w-3.5" />} onClick={onReactivate}>
              Reactivate
            </Button>
          ) : (
            <Button variant="quiet" iconLeft={frozen ? <Play className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />} onClick={onToggleFreeze}>
              {frozen ? 'Unfreeze' : 'Freeze'}
            </Button>
          )}
          <Button iconLeft={<CalendarPlus className="h-3.5 w-3.5" />} onClick={onExtend}>
            Extend
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.user.name} tone={row.user.avatarColor} size="lg" />
          <div>
            <StatusPill membership={row.membership} />
            <p className="font-mono mt-1.5 text-[11.5px] text-mute">{formatMemberId(row.user.id)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fields.map(([k, v]) => (
            <div key={k} className="rounded-[9px] border border-line bg-raised px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-mute">{k}</p>
              <p className="mt-1 text-[12.5px] font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[9px] border border-line p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.08em] text-mute">
            Door result if scanned right now
          </p>
          <p className={`flex items-start gap-2 text-[13px] font-semibold ${access.ok ? 'text-good' : 'text-bad'}`}>
            <Badge tone={access.ok ? 'good' : 'bad'} size="sm">
              {access.ok ? 'Granted' : 'Denied'}
            </Badge>
            <span className="font-normal text-dim">{reasonText(access)}</span>
          </p>
        </div>
      </div>
    </Modal>
  )
}
