import { Check, X } from 'lucide-react'
import { checkPasswordStrength } from '@/lib/validators'
import { useLanguage } from '@/context/LanguageContext'

const BAR_COLORS = ['bg-bad', 'bg-ember', 'bg-warn', 'bg-good', 'bg-volt']
const LABEL_KEYS = [
  'passwordStrength.veryWeak',
  'passwordStrength.weak',
  'passwordStrength.fair',
  'passwordStrength.strong',
  'passwordStrength.veryStrong',
] as const

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useLanguage()
  if (!password) return null
  const strength = checkPasswordStrength(password)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? BAR_COLORS[strength.score] : 'bg-line'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">
        <span className="font-display font-bold uppercase tracking-[.04em] text-ink">
          {t(LABEL_KEYS[strength.score])}
        </span>
        <RequirementChip met={strength.checks.length} label={t('passwordStrength.chars8')} />
        <RequirementChip met={strength.checks.upper} label={t('passwordStrength.uppercase')} />
        <RequirementChip met={strength.checks.number} label={t('passwordStrength.number')} />
        <RequirementChip met={strength.checks.symbol} label={t('passwordStrength.symbol')} />
      </div>
    </div>
  )
}

function RequirementChip({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${met ? 'text-good' : 'text-mute'}`}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  )
}
