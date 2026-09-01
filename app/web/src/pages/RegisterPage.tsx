import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useL } from '../lib/i18n'
import { ApiError } from '../api/client'
import { Card, Button, inputCls, Field, Select } from '../components/primitives'

const LOCATIONS = [
  { code: 'ART', el: 'Power Life Gym — Αρτέμιδος', en: 'Power Life Gym — Artemidos' },
  { code: 'PIL', el: 'Power Life Gym — Στούντιο Pilates', en: 'Power Life Gym — Pilates Studio' },
]
const PLANS = [
  { code: 'basic', el: 'Basic Pass · €35/μήνα', en: 'Basic Pass · €35/month' },
  { code: 'group', el: 'Group Pass · €50/μήνα', en: 'Group Pass · €50/month' },
  { code: 'premium', el: 'Premium Pilates · €75/μήνα', en: 'Premium Pilates · €75/month' },
]

export function RegisterPage() {
  const { register } = useAuth()
  const { t, lang } = useL()
  const nav = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', phone: '',
    home_location_code: 'ART', plan_code: 'group',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register({ ...form, phone: form.phone || undefined, locale: lang })
      nav('/')
    } catch (err) {
      setError(err instanceof ApiError ? (t(`err${err.code}`) !== `err${err.code}` ? t(`err${err.code}`) : err.message) : t('errNETWORK'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <span className="w-10 h-10 rounded-[9px] bg-volt text-voltink grid place-items-center display text-[14px] font-extrabold">PL</span>
          <p className="display text-[15px] font-extrabold uppercase tracking-[.06em]">Power Life <span className="text-volt">Gym</span></p>
        </div>

        <Card className="p-5">
          <h1 className="display text-[18px] font-extrabold uppercase tracking-[.04em] mb-4">{t('registerTitle')}</h1>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('firstName')}>
                <input className={inputCls} required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} autoComplete="given-name" />
              </Field>
              <Field label={t('lastName')}>
                <input className={inputCls} required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} autoComplete="family-name" />
              </Field>
            </div>
            <Field label={t('email')}>
              <input className={inputCls} type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
            </Field>
            <Field label={t('password')} hint={lang === 'el' ? 'Τουλάχιστον 10 χαρακτήρες' : 'At least 10 characters'}>
              <input className={inputCls} type="password" required minLength={10} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label={t('phone')}>
              <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
            </Field>
            <Field label={t('homeLocation')}>
              <Select value={form.home_location_code} onChange={(e) => set('home_location_code', e.target.value)}>
                {LOCATIONS.map((l) => <option key={l.code} value={l.code}>{lang === 'el' ? l.el : l.en}</option>)}
              </Select>
            </Field>
            <Field label={t('choosePlan')}>
              <Select value={form.plan_code} onChange={(e) => set('plan_code', e.target.value)}>
                {PLANS.map((p) => <option key={p.code} value={p.code}>{lang === 'el' ? p.el : p.en}</option>)}
              </Select>
            </Field>
            {error && <p className="text-[12.5px] text-bad">{error}</p>}
            <Button type="submit" icon={UserPlus} disabled={busy} className="w-full">
              {busy ? t('creatingAccount') : t('createAccount')}
            </Button>
          </form>
          <p className="text-[12px] text-dim text-center mt-4">
            {t('haveAccount')} <Link to="/login" className="text-volt font-semibold hover:underline">{t('signInInstead')}</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
