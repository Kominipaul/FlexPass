import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, TriangleAlert, User, UserPlus, Lock } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { PlanCard } from '@/components/PlanCard'
import { BillingCycleToggle } from '@/components/BillingCycleToggle'
import { useAuth } from '@/context/AuthContext'
import { PLANS } from '@/lib/seedData'
import { isValidEmail, isValidPassword, isValidPhone, type FieldErrors } from '@/lib/validators'
import type { BillingCycle } from '@/types'

type StepOneField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<StepOneField>>({})

  const [planId, setPlanId] = useState('plan_standard')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

  const [topError, setTopError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validateStepOne(): boolean {
    const errors: FieldErrors<StepOneField> = {}
    if (name.trim().length < 2) errors.name = 'Enter your full name.'
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.'
    if (!isValidPhone(phone)) errors.phone = 'Enter a valid phone number.'
    if (!isValidPassword(password)) errors.password = 'Use 8+ characters with a mix of letters & numbers.'
    if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleStepOneSubmit(e: FormEvent) {
    e.preventDefault()
    if (validateStepOne()) {
      setTopError(null)
      setStep(2)
    }
  }

  async function handleCreateAccount() {
    setTopError(null)
    setSubmitting(true)
    try {
      await signup({ name, email, phone, password, planId, billingCycle })
      navigate('/', { replace: true })
    } catch (err) {
      setTopError(err instanceof Error ? err.message : 'Could not create your account.')
      setStep(1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={step === 1 ? 'Create your account' : 'Choose your plan'}
      subtitle={
        step === 1
          ? 'Join FlexPass to book classes, track visits and manage your membership.'
          : 'You can change plans anytime from your dashboard.'
      }
    >
      <div className="mb-6 flex items-center gap-2">
        <StepDot label="1" current={step === 1} done={step > 1} />
        <span className="h-px flex-1 bg-line" />
        <StepDot label="2" current={step === 2} done={false} />
      </div>

      {topError && (
        <div className="mb-4 flex items-start gap-2 rounded-[9px] border border-badsoft bg-badsoft px-3.5 py-3 text-[13px] text-bad">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{topError}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleStepOneSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Full name"
            placeholder="Jamie Rivera"
            autoComplete="name"
            iconLeft={<User className="h-4 w-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            iconLeft={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Input
            label="Phone number"
            type="tel"
            placeholder="(555) 123-4567"
            autoComplete="tel"
            iconLeft={<Phone className="h-4 w-4" />}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors.phone}
          />
          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              iconLeft={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />
            <div className="mt-2">
              <PasswordStrengthMeter password={password} />
            </div>
          </div>
          <Input
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            iconLeft={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
          />

          <Button type="submit" size="lg" iconLeft={<UserPlus className="h-4 w-4" />}>
            Continue
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          <div className="flex flex-col gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                selected={planId === plan.id}
                onSelect={() => setPlanId(plan.id)}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="quiet" onClick={() => setStep(1)} iconLeft={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button
              className="flex-1"
              size="lg"
              loading={submitting}
              onClick={handleCreateAccount}
              iconLeft={<UserPlus className="h-4 w-4" />}
            >
              Create account
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <p className="mt-6 text-center text-[12.5px] text-dim">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-volt hover:brightness-125">
            Sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  )
}

function StepDot({ label, current, done }: { label: string; current: boolean; done: boolean }) {
  return (
    <span
      className={`font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        current || done ? 'bg-volt text-voltink' : 'bg-raised text-mute'
      }`}
    >
      {done ? '✓' : label}
    </span>
  )
}
