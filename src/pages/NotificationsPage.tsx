import { useState } from 'react'
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Receipt,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { TONES, type Tone } from '@/lib/colors'
import { relativeTime } from '@/lib/format'
import { getNotificationPrefs } from '@/lib/notificationPrefs'
import type { AppNotification, NotificationType } from '@/types'

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: Tone }> = {
  renewal: { icon: CalendarClock, tone: 'amber' },
  class: { icon: CalendarClock, tone: 'brand' },
  billing: { icon: Receipt, tone: 'violet' },
  security: { icon: ShieldCheck, tone: 'rose' },
  achievement: { icon: Trophy, tone: 'lime' },
  general: { icon: Bell, tone: 'slate' },
}

export function NotificationsPage() {
  const { loading, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useGymData()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  if (loading) return <PageLoader label="Loading notifications…" />

  const prefs = getNotificationPrefs()
  const enabled = notifications.filter((n) => prefs[n.type])
  const visible = tab === 'unread' ? enabled.filter((n) => !n.read) : enabled
  const mutedCount = notifications.length - enabled.length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">Renewals, class reminders, billing and security alerts.</p>
        </div>
        {unreadNotificationCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllNotificationsRead()} iconLeft={<CheckCheck className="h-4 w-4" />}>
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs
        items={[
          { key: 'all', label: 'All', count: enabled.length || undefined },
          { key: 'unread', label: 'Unread', count: unreadNotificationCount || undefined },
        ]}
        active={tab}
        onChange={(k) => setTab(k as 'all' | 'unread')}
        className="max-w-xs"
      />

      {mutedCount > 0 && (
        <p className="text-xs text-slate-400">
          {mutedCount} notification{mutedCount === 1 ? '' : 's'} hidden by your notification preferences.
        </p>
      )}

      <Card>
        <CardBody>
          {visible.length === 0 ? (
            <EmptyState
              icon={<BellOff className="h-5 w-5" />}
              title={tab === 'unread' ? "You're all caught up" : 'No notifications yet'}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {visible.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={() => markNotificationRead(n.id)} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function NotificationRow({ notification, onRead }: { notification: AppNotification; onRead: () => void }) {
  const meta = TYPE_META[notification.type]
  const classes = TONES[meta.tone]
  const Icon = meta.icon

  return (
    <li
      onClick={() => !notification.read && onRead()}
      className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${!notification.read ? 'cursor-pointer' : ''}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${classes.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${notification.read ? 'font-medium text-ink-700' : 'font-bold text-ink-900'}`}>
            {notification.title}
          </p>
          {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
        <p className="mt-1 text-xs text-slate-400">{relativeTime(notification.createdAt)}</p>
      </div>
    </li>
  )
}
