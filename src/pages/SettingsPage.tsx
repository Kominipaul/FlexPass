import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Flame,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { formatDate } from '@/lib/format'
import { isValidPassword } from '@/lib/validators'
import { getNotificationPrefs, setNotificationPref, type NotificationPrefs } from '@/lib/notificationPrefs'
import type { NotificationType } from '@/types'

const PREF_LABELS: { key: NotificationType; label: string; description: string }[] = [
  { key: 'renewal', label: 'Renewal reminders', description: 'Your membership is about to renew.' },
  { key: 'class', label: 'Class & group reminders', description: 'Upcoming bookings and waitlist updates.' },
  { key: 'billing', label: 'Billing receipts', description: 'Payments, invoices and plan changes.' },
  { key: 'security', label: 'Security alerts', description: 'Password changes and sign-in security.' },
  { key: 'achievement', label: 'Streaks & achievements', description: 'Visit streaks and milestones.' },
  { key: 'general', label: 'General announcements', description: 'Everything else from FlexPass.' },
]

export function SettingsPage() {
  const { user, changePassword, setTwoFactorEnabled, deleteAccount } = useAuth()
  const { trainingGoal, setTrainingGoal, pinAllowance } = useGymData()
  const { showToast } = useToast()

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
      setPasswordError('Enter your current password.')
      return
    }
    if (!isValidPassword(newPassword)) {
      setPasswordError('Use 8+ characters with a mix of letters & numbers.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPasswordError(null)
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleToggleTwoFactor(next: boolean) {
    setTwoFactorBusy(true)
    try {
      await setTwoFactorEnabled(next)
      showToast(next ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update security settings.', 'error')
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
      showToast(next ? 'Progression turned on.' : 'Progression turned off.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update progression.', 'error')
    } finally {
      setProgressionBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Security, progression, notifications and account controls." />

      <Card>
        <CardHeader icon={<Lock className="h-4 w-4" />} title="Password" description={`Last changed ${formatDate(user.security.lastPasswordChange)}`} />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:max-w-md">
            {passwordError && <p className="text-[12.5px] font-medium text-bad">{passwordError}</p>}
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div>
              <Input
                label="New password"
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
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button className="self-start" loading={savingPassword} onClick={handleChangePassword} iconLeft={<KeyRound className="h-3.5 w-3.5" />}>
              Update password
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Two-factor authentication" />
        <CardBody>
          <Switch
            checked={user.security.twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            disabled={twoFactorBusy}
            label="Require a secure code at sign-in"
            description="Adds a 6-digit code step after your password when you log in."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<Flame className="h-4 w-4" />}
          title="Progression"
          description="Streaks, badges and your weekly training goal."
        />
        <CardBody className="flex flex-col gap-4">
          <Switch
            checked={trainingGoal?.enabled ?? true}
            onChange={handleToggleProgression}
            disabled={progressionBusy || !trainingGoal}
            label="Track a weekly goal"
            description="Off means no streak and no badges — Progress becomes a plain list of your visits."
          />
          {trainingGoal?.enabled && (
            <p className="text-[12px] text-mute">
              Currently aiming for{' '}
              <span className="font-semibold text-ink">{trainingGoal.daysPerWeek} days a week</span>. Change it on
              the{' '}
              <Link to="/progress" className="font-semibold text-volt hover:brightness-125">
                Progress page
              </Link>
              .
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<KeyRound className="h-4 w-4" />}
          title="Backup PIN"
          description="For the day you turn up without your phone."
        />
        <CardBody className="flex flex-col gap-3">
          <p className="text-[12.5px] leading-relaxed text-dim">
            Your PIN can't be typed at the reader on its own — there's no keypad until a staff member looks you up
            and opens one for you. That's why four digits is enough, and why giving your PIN to someone else
            doesn't get them in.
          </p>
          <div className="flex items-center justify-between rounded-[9px] border border-line bg-raised px-4 py-3">
            <span className="text-[12.5px] text-dim">Backup check-ins used</span>
            <span className={`font-mono tnum text-[13px] font-semibold ${pinAllowance.overLimit ? 'text-warn' : 'text-ink'}`}>
              {pinAllowance.used} / {pinAllowance.limit}
            </span>
          </div>
          <p className="text-[11.5px] text-mute">
            Resets on a rolling {pinAllowance.windowDays} days. View or regenerate your PIN on the{' '}
            <Link to="/" className="font-semibold text-volt hover:brightness-125">
              Check In page
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Bell className="h-4 w-4" />} title="Notification preferences" description="Controls what appears in your notification center." />
        <CardBody className="flex flex-col gap-4">
          {PREF_LABELS.map((p) => (
            <Switch
              key={p.key}
              checked={prefs[p.key]}
              onChange={(value) => handleTogglePref(p.key, value)}
              label={p.label}
              description={p.description}
            />
          ))}
        </CardBody>
      </Card>

      <Card className="border-badsoft">
        <CardHeader icon={<AlertTriangle className="h-4 w-4 text-bad" />} title="Danger zone" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-badsoft bg-badsoft/40 p-4">
            <div>
              <p className="text-[13px] font-semibold text-bad">Delete account</p>
              <p className="text-[11.5px] text-bad/80">Permanently deletes your profile, bookings and billing history.</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} iconLeft={<Trash2 className="h-3.5 w-3.5" />}>
              Delete account
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        icon={<Trash2 className="h-4 w-4" />}
        title="Delete your account?"
        description="This permanently deletes your profile, membership, bookings and billing history. This cannot be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={async () => {
          try {
            await deleteAccount()
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not delete account.', 'error')
          } finally {
            setDeleteOpen(false)
          }
        }}
      />
    </div>
  )
}
