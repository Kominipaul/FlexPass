import { api } from './client'
import type {
  MeDTO, PassResponse, ClassDTO, MyBookingDTO, InvoiceDTO, AnnouncementDTO,
} from './types'

export const getMe = () => api<MeDTO>('/api/v1/me')
export const getPass = () => api<PassResponse>('/api/v1/me/pass')

export const listClasses = (params: { location?: string; discipline?: string } = {}) => {
  const qs = new URLSearchParams()
  if (params.location) qs.set('location', params.location)
  if (params.discipline) qs.set('discipline', params.discipline)
  const suffix = qs.toString() ? `?${qs}` : ''
  return api<ClassDTO[]>(`/api/v1/classes${suffix}`)
}

export const bookClass = (classID: string) =>
  api<{ status: string; waitlist_position?: number }>(`/api/v1/classes/${classID}/book`, { method: 'POST' })

export const cancelBooking = (classID: string) =>
  api<void>(`/api/v1/classes/${classID}/book`, { method: 'DELETE' })

export const listMyBookings = () => api<MyBookingDTO[]>('/api/v1/me/bookings')

export const freezeMembership = (weeks: number) =>
  api<{ fee_cents: number }>('/api/v1/me/membership/freeze', { method: 'POST', body: { weeks } })

export const unfreezeMembership = () =>
  api<{ ends_on: string }>('/api/v1/me/membership/unfreeze', { method: 'POST' })

export const renewMembership = () =>
  api<{ ends_on: string; charged_cents: number }>('/api/v1/me/membership/renew', { method: 'POST' })

export const changePlan = (planCode: string) =>
  api<{ prorated_cents: number }>('/api/v1/me/membership/plan', { method: 'POST', body: { plan_code: planCode } })

export const listInvoices = () => api<InvoiceDTO[]>('/api/v1/me/invoices')
export const listAnnouncements = () => api<AnnouncementDTO[]>('/api/v1/announcements')
