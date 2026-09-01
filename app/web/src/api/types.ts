export interface Bilingual { el: string; en: string }

export interface UserDTO {
  id: string
  email: string
  role: 'member' | 'staff' | 'admin'
  locale: 'el' | 'en'
}

export interface LocationRefDTO { code: string; name: Bilingual }
export interface PlanRefDTO { code: string; name: Bilingual; price_cents: number }

export interface MembershipDTO {
  id: string
  plan: PlanRefDTO
  starts_on: string
  ends_on: string
  status: 'active' | 'frozen' | 'expired' | 'cancelled'
  auto_renew: boolean
  days_left: number
  allowed_location_codes: string[]
  allowed_discipline_codes: string[]
}

export interface MemberDTO {
  id: string
  member_code: string
  first_name: string
  last_name: string
  phone?: string
  joined_on: string
  home_location: LocationRefDTO
  membership: MembershipDTO
}

export interface MeDTO {
  user: UserDTO
  member?: MemberDTO
}

export interface SessionResponse {
  access_token: string
  csrf_token: string
  expires_in: number
  me: MeDTO
}

export interface PassResponse {
  member_code: string
  door_secret_b64: string
  window_seconds: number
}

export interface DisciplineDTO { code: string; name: Bilingual; icon: string }

export interface ClassDTO {
  id: string
  discipline: DisciplineDTO
  trainer: Bilingual
  location: LocationRefDTO
  starts_at: string
  duration_min: number
  capacity: number
  booked: number
  level: 'all' | 'beginner' | 'inter' | 'adv'
  my_status?: 'booked' | 'waitlisted'
  allowed: boolean
}

export interface MyBookingDTO {
  class_id: string
  status: 'booked' | 'waitlisted'
  waitlist_position?: number
  discipline: Bilingual
  location_code: string
  starts_at: string
}

export interface InvoiceDTO {
  number: string
  issued_on: string
  description: Bilingual
  amount_cents: number
  status: 'paid' | 'refunded' | 'pending'
  method?: string
}

export interface AnnouncementDTO {
  id: string
  kind: 'offer' | 'news'
  title: Bilingual
  body: Bilingual
  cta_label?: Bilingual
  cta_action?: string
}

export interface ProblemDTO {
  code: string
  detail?: string
  extra?: unknown
}
