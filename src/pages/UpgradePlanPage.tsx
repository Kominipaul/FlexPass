import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Store } from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { PageLoader } from '@/components/ui/Spinner'
import { PlanCard } from '@/components/PlanCard'
import { BillingCycleToggle } from '@/components/BillingCycleToggle'
import type { BillingCycle } from '@/types'

// Plan changes are staff-only for now — there's no online payment provider
// to bill the difference (see server/src/routes/member.ts). This page is
// browsing only: compare plans and prices, then talk to the front desk to
// actually switch. That's also why there's no BillingCycleToggle-driven
// submit button here anymore.
export function UpgradePlanPage() {
  const { loading, plans, membership, currentPlan } = useGymData()
  const navigate = useNavigate()

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(membership?.billingCycle ?? 'monthly')

  if (loading || !membership || !currentPlan) return <PageLoader label="Loading plans…" />

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <button
          type="button"
          onClick={() => navigate('/membership')}
          className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to membership
        </button>
        <h2 className="font-display text-[22px] font-extrabold text-ink">Compare plans</h2>
        <p className="mt-1 text-[13px] text-dim">
          Browse what each plan includes. To switch, visit the front desk — we don't take
          payment for plan changes online yet.
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-raised px-3.5 py-3 text-[12.5px] text-dim">
        <Store className="h-4 w-4 shrink-0 text-mute" />
        Ready to switch? Our staff can move you to a new plan and take payment in person.
      </div>

      <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            current={plan.id === membership.planId && billingCycle === membership.billingCycle}
            readOnly
          />
        ))}
      </div>
    </div>
  )
}
