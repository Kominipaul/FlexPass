import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { PlanCard } from '@/components/PlanCard'
import { BillingCycleToggle } from '@/components/BillingCycleToggle'
import { formatCurrency } from '@/lib/format'
import type { BillingCycle } from '@/types'

export function UpgradePlanPage() {
  const { loading, plans, membership, currentPlan, upgradePlan } = useGymData()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(membership?.billingCycle ?? 'monthly')
  const [selectedPlanId, setSelectedPlanId] = useState(membership?.planId ?? '')
  const [submitting, setSubmitting] = useState(false)

  if (loading || !membership || !currentPlan) return <PageLoader label="Loading plans…" />

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? currentPlan
  const isUnchanged = selectedPlanId === membership.planId && billingCycle === membership.billingCycle
  const price = billingCycle === 'yearly' ? selectedPlan.priceYearly : selectedPlan.priceMonthly

  async function handleConfirm() {
    setSubmitting(true)
    try {
      await upgradePlan(selectedPlanId, billingCycle)
      showToast(`You're now on the ${selectedPlan.name} plan.`)
      navigate('/membership')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not change your plan.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div>
        <button
          type="button"
          onClick={() => navigate('/membership')}
          className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to membership
        </button>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Choose your plan</h2>
        <p className="mt-1 text-[13px] text-dim">
          Switch anytime — changes apply immediately and are billed pro-rated.
        </p>
      </div>

      <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            selected={selectedPlanId === plan.id}
            current={plan.id === membership.planId && billingCycle === membership.billingCycle}
            onSelect={() => setSelectedPlanId(plan.id)}
          />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:pl-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[12.5px] text-dim">
              Selected: <span className="font-semibold text-ink">{selectedPlan.name}</span> ·{' '}
              {formatCurrency(price)}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
            </p>
          </div>
          <Button
            size="lg"
            disabled={isUnchanged}
            loading={submitting}
            onClick={handleConfirm}
            iconLeft={<Sparkles className="h-4 w-4" />}
          >
            {isUnchanged ? 'This is your current plan' : `Switch to ${selectedPlan.name}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
