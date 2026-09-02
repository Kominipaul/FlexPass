import type { NotificationType } from '@/types'
import { storage } from './storage'

export type NotificationPrefs = Record<NotificationType, boolean>

const DEFAULT_PREFS: NotificationPrefs = {
  renewal: true,
  class: true,
  billing: true,
  security: true,
  achievement: true,
  general: true,
}

const KEY = 'notificationPrefs'

export function getNotificationPrefs(): NotificationPrefs {
  return { ...DEFAULT_PREFS, ...storage.get<Partial<NotificationPrefs>>(KEY, {}) }
}

export function setNotificationPref(type: NotificationType, enabled: boolean): NotificationPrefs {
  const next = { ...getNotificationPrefs(), [type]: enabled }
  storage.set(KEY, next)
  return next
}
