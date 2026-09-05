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
import { useLanguage } from '@/context/LanguageContext'
import { PLANS } from '@/lib/reference'
import { isValidEmail, isValidPassword, isValidPhone, type FieldErrors } from '@/lib/validators'
import type { BillingCycle } from '@/types'

type StepOneField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword'

export function SignupPage() {
  const { signup } = useAuth()
  const { t } = useLanguage()
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
    if (name.trim().length < 2) errors.name = t('signup.nameRequired')
    if (!isValidEmail(email)) errors.email = t('signup.emailInvalid')
    if (!isValidPhone(phone)) errors.phone = t('signup.phoneInvalid')
    if (!isValidPassword(password)) errors.password = t('signup.passwordWeak')
    if (confirmPassword !== password) errors.confirmPassword = t('signup.passwordMismatch')
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
      setTopError(err instanceof Error ? err.message : t('signup.createAccountError'))
      setStep(1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={step === 1 ? t('signup.titleStep1') : t('signup.titleStep2')}
      subtitle={step === 1 ? t('signup.subtitleStep1') : t('signup.subtitleStep2')}
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
            label={t('signup.fullName')}
            placeholder="Jamie Rivera"
            autoComplete="name"
            iconLeft={<User className="h-4 w-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label={t('signup.email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            iconLeft={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Input
            label={t('signup.phone')}
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
              label={t('signup.password')}
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
            label={t('signup.confirmPassword')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            iconLeft={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
          />

          <Button type="submit" size="lg" iconLeft={<UserPlus className="h-4 w-4" />}>
            {t('signup.continue')}
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
              {t('signup.back')}
            </Button>
            <Button
              className="flex-1"
              size="lg"
              loading={submitting}
              onClick={handleCreateAccount}
              iconLeft={<UserPlus className="h-4 w-4" />}
            >
              {t('signup.createAccount')}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <p className="mt-6 text-center text-[12.5px] text-dim">
          {t('signup.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-volt hover:brightness-125">
            {t('signup.signIn')}
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
