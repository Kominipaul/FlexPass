import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Flame,
  Globe,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { useLanguage, type TranslationKey } from '@/context/LanguageContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { formatDate } from '@/lib/format'
import { isValidPassword } from '@/lib/validators'
import { getNotificationPrefs, setNotificationPref, type NotificationPrefs } from '@/lib/notificationPrefs'
import type { NotificationType } from '@/types'

const PREF_LABEL_KEYS: { key: NotificationType; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { key: 'renewal', labelKey: 'settings.prefRenewalLabel', descKey: 'settings.prefRenewalDesc' },
  { key: 'class', labelKey: 'settings.prefClassLabel', descKey: 'settings.prefClassDesc' },
  { key: 'billing', labelKey: 'settings.prefBillingLabel', descKey: 'settings.prefBillingDesc' },
  { key: 'security', labelKey: 'settings.prefSecurityLabel', descKey: 'settings.prefSecurityDesc' },
  { key: 'achievement', labelKey: 'settings.prefAchievementLabel', descKey: 'settings.prefAchievementDesc' },
  { key: 'general', labelKey: 'settings.prefGeneralLabel', descKey: 'settings.prefGeneralDesc' },
]

export function SettingsPage() {
  const { user, changePassword, setTwoFactorEnabled, deleteAccount } = useAuth()
  const { trainingGoal, setTrainingGoal, pinAllowance } = useGymData()
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [progressionBusy, setProgressionBusy] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs())

  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!user) return null

  async function handleChangePassword() {
    if (!currentPassword) {
      setPasswordError(t('settings.enterCurrentPassword'))
      return
    }
    if (!isValidPassword(newPassword)) {
      setPasswordError(t('settings.passwordWeak'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'))
      return
    }
    setPasswordError(null)
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast(t('settings.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('settings.passwordUpdateError'))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleToggleTwoFactor(next: boolean) {
    setTwoFactorBusy(true)
    try {
      await setTwoFactorEnabled(next)
      showToast(next ? t('settings.twoFactorEnabled') : t('settings.twoFactorDisabled'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('settings.twoFactorError'), 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  function handleTogglePref(key: NotificationType, value: boolean) {
    setPrefs(setNotificationPref(key, value))
  }

  async function handleToggleProgression(next: boolean) {
    setProgressionBusy(true)
    try {
      await setTrainingGoal({ enabled: next })
      showToast(next ? t('settings.progressionOn') : t('settings.progressionOff'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('settings.progressionError'), 'error')
    } finally {
      setProgressionBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Card>
        <CardHeader
          icon={<Lock className="h-4 w-4" />}
          title={t('settings.passwordTitle')}
          description={t('settings.lastChanged', { date: formatDate(user.security.lastPasswordChange) })}
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:max-w-md">
            {passwordError && <p className="text-[12.5px] font-medium text-bad">{passwordError}</p>}
            <Input
              label={t('settings.currentPassword')}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div>
              <Input
                label={t('settings.newPassword')}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="mt-2">
                <PasswordStrengthMeter password={newPassword} />
              </div>
            </div>
            <Input
              label={t('settings.confirmNewPassword')}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button className="self-start" loading={savingPassword} onClick={handleChangePassword} iconLeft={<KeyRound className="h-3.5 w-3.5" />}>
              {t('settings.updatePassword')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title={t('settings.twoFactorTitle')} />
        <CardBody>
          <Switch
            checked={user.security.twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            disabled={twoFactorBusy}
            label={t('settings.twoFactorLabel')}
            description={t('settings.twoFactorDesc')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<Flame className="h-4 w-4" />}
          title={t('settings.progressionTitle')}
          description={t('settings.progressionDesc')}
        />
        <CardBody className="flex flex-col gap-4">
          <Switch
            checked={trainingGoal?.enabled ?? true}
            onChange={handleToggleProgression}
            disabled={progressionBusy || !trainingGoal}
            label={t('settings.progressionLabel')}
            description={t('settings.progressionSwitchDesc')}
          />
          {trainingGoal?.enabled && (() => {
            const [before, after] = t('settings.currentlyAiming', { days: trainingGoal.daysPerWeek }).split('{link}')
            return (
              <p className="text-[12px] text-mute">
                {before}
                <Link to="/progress" className="font-semibold text-volt hover:brightness-125">
                  {t('settings.progressPageLink')}
                </Link>
                {after}
              </p>
            )
          })()}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<KeyRound className="h-4 w-4" />}
          title={t('settings.backupPinTitle')}
          description={t('settings.backupPinDesc')}
        />
        <CardBody className="flex flex-col gap-3">
          <p className="text-[12.5px] leading-relaxed text-dim">{t('settings.backupPinExplain')}</p>
          <div className="flex items-center justify-between rounded-[9px] border border-line bg-raised px-4 py-3">
            <span className="text-[12.5px] text-dim">{t('settings.backupCheckInsUsed')}</span>
            <span className={`font-mono tnum text-[13px] font-semibold ${pinAllowance.overLimit ? 'text-warn' : 'text-ink'}`}>
              {pinAllowance.used} / {pinAllowance.limit}
            </span>
          </div>
          {(() => {
            const [before, after] = t('settings.resetsOn', { days: pinAllowance.windowDays }).split('{link}')
            return (
              <p className="text-[11.5px] text-mute">
                {before}
                <Link to="/" className="font-semibold text-volt hover:brightness-125">
                  {t('settings.checkInPageLink')}
                </Link>
                {after}
              </p>
            )
          })()}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<Bell className="h-4 w-4" />}
          title={t('settings.notificationPrefsTitle')}
          description={t('settings.notificationPrefsDesc')}
        />
        <CardBody className="flex flex-col gap-4">
          {PREF_LABEL_KEYS.map((p) => (
            <Switch
              key={p.key}
              checked={prefs[p.key]}
              onChange={(value) => handleTogglePref(p.key, value)}
              label={t(p.labelKey)}
              description={t(p.descKey)}
            />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Globe className="h-4 w-4" />} title={t('settings.languageTitle')} description={t('settings.languageDesc')} />
        <CardBody>
          <LanguageSwitcher className="max-w-xs" />
        </CardBody>
      </Card>

      <Card className="border-badsoft">
        <CardHeader icon={<AlertTriangle className="h-4 w-4 text-bad" />} title={t('settings.dangerZone')} />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-badsoft bg-badsoft/40 p-4">
            <div>
              <p className="text-[13px] font-semibold text-bad">{t('settings.deleteAccountTitle')}</p>
              <p className="text-[11.5px] text-bad/80">{t('settings.deleteAccountDesc')}</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} iconLeft={<Trash2 className="h-3.5 w-3.5" />}>
              {t('settings.deleteAccountButton')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        icon={<Trash2 className="h-4 w-4" />}
        title={t('settings.deleteConfirmTitle')}
        description={t('settings.deleteConfirmDesc')}
        confirmLabel={t('settings.deleteAccountButton')}
        tone="danger"
        onConfirm={async () => {
          try {
            await deleteAccount()
          } catch (err) {
            showToast(err instanceof Error ? err.message : t('settings.deleteAccountError'), 'error')
          } finally {
            setDeleteOpen(false)
          }
        }}
      />
    </div>
  )
}
