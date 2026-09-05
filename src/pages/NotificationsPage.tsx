import { useState } from 'react'
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Receipt,
  ShieldCheck,
  Trash2,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { TONES, type Tone } from '@/lib/colors'
import { relativeTime } from '@/lib/format'
import { getNotificationPrefs } from '@/lib/notificationPrefs'
import { NOTIFICATION_TTL_DAYS } from '@/lib/notificationPolicy'
import type { AppNotification, NotificationType } from '@/types'

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  renewal: { icon: CalendarClock, tone: 'warn' },
  class: { icon: CalendarClock, tone: 'volt' },
  billing: { icon: Receipt, tone: 's3' },
  security: { icon: ShieldCheck, tone: 'bad' },
  achievement: { icon: Trophy, tone: 'good' },
  general: { icon: Bell, tone: 'slate' },
}

export function NotificationsPage() {
  const {
    loading, notifications, unreadNotificationCount,
    markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications,
  } = useGymData()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [clearAllOpen, setClearAllOpen] = useState(false)

  if (loading) return <PageLoader label="Loading notifications…" />

  const prefs = getNotificationPrefs()
  const enabled = notifications.filter((n) => prefs[n.type])
  const visible = tab === 'unread' ? enabled.filter((n) => !n.read) : enabled
  const mutedCount = notifications.length - enabled.length

  async function handleDelete(id: string) {
    try {
      await deleteNotification(id)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete that notification.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        subtitle="Renewals, class reminders, billing and security alerts."
        action={
          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <Button
                size="sm"
                variant="quiet"
                onClick={() => markAllNotificationsRead()}
                iconLeft={<CheckCheck className="h-3.5 w-3.5" />}
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setClearAllOpen(true)}
                iconLeft={<Trash2 className="h-3.5 w-3.5" />}
              >
                Clear all
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        items={[
          { key: 'all', label: 'All', count: enabled.length || undefined },
          { key: 'unread', label: 'Unread', count: unreadNotificationCount || undefined },
        ]}
        active={tab}
        onChange={(k) => setTab(k as 'all' | 'unread')}
        className="max-w-xs"
      />

      <div className="flex flex-col gap-1">
        {mutedCount > 0 && (
          <p className="text-[11px] text-mute">
            {mutedCount} notification{mutedCount === 1 ? '' : 's'} hidden by your notification preferences.
          </p>
        )}
        <p className="text-[11px] text-mute">
          Delete one anytime with the bin icon — anything left is cleared automatically after{' '}
          {NOTIFICATION_TTL_DAYS} days.
        </p>
      </div>

      <Card>
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={<BellOff className="h-5 w-5" />}
              title={tab === 'unread' ? "You're all caught up" : 'No notifications yet'}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-linesoft">
              {visible.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={() => markNotificationRead(n.id)}
                  onDelete={() => handleDelete(n.id)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={clearAllOpen}
        onClose={() => setClearAllOpen(false)}
        icon={<Trash2 className="h-4 w-4" />}
        title="Clear all notifications?"
        description="This deletes your whole notification history. It can't be undone."
        confirmLabel="Clear all"
        tone="danger"
        onConfirm={async () => {
          try {
            await clearAllNotifications()
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not clear notifications.', 'error')
          } finally {
            setClearAllOpen(false)
          }
        }}
      />
    </div>
  )
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification
  onRead: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[notification.type]
  const classes = TONES[meta.tone]
  const Icon = meta.icon

  return (
    <li
      onClick={() => !notification.read && onRead()}
      className={`group flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${!notification.read ? 'cursor-pointer' : ''}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${classes.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[13px] ${notification.read ? 'font-medium text-dim' : 'font-bold text-ink'}`}>
            {notification.title}
          </p>
          {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />}
        </div>
        <p className="mt-0.5 text-[12.5px] text-dim">{notification.message}</p>
        <p className="mt-1 text-[10.5px] text-mute">{relativeTime(notification.createdAt)}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Delete notification"
        className="-mr-1.5 -mt-1 shrink-0 rounded-[7px] p-2 text-mute opacity-60 transition-opacity hover:bg-line hover:text-bad hover:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}
