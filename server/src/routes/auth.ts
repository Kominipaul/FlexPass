/**
 * Member + staff authentication.
 *
 * Basic email/password only, by request: no SMS, no TOTP, no 2FA step. The
 * `twoFactorEnabled` flag survives on the user record so the Settings
 * toggle still stores a preference, but login never branches on it.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { one, query } from '../db.ts'
import { makeId } from '../id.ts'
import { makeSecretSalt } from '../domain/tokens.ts'
import { toStaff, toUser } from '../mappers.ts'
import {
  MEMBER_COOKIE, STAFF_COOKIE, checkPassword, clearSessionCookie, createSession,
  destroyAllSessions, destroySession, hashPassword, requireMember, requireStaff, setSessionCookie,
} from '../auth.ts'

const AVATARS = ['volt', 'ember', 's1', 's2', 's3', 's4', 's5']

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional().default(false),
})

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().default(''),
  password: z.string().min(8, 'Use at least 8 characters.'),
  planId: z.string().min(1, 'Select a plan.'),
  billingCycle: z.enum(['monthly', 'yearly']),
})

export default async function authRoutes(app: FastifyInstance) {
  const isHttps = (req: { protocol: string; headers: Record<string, any> }) =>
    req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'

  app.post('/api/auth/signup', async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message })
    const input = parsed.data
    const email = input.email.toLowerCase()

    const clash = await one('SELECT id FROM users WHERE lower(email) = $1', [email])
    if (clash) return reply.code(409).send({ error: 'An account with this email already exists.' })

    const plan = await one<any>('SELECT * FROM plans WHERE id = $1', [input.planId])
    if (!plan) return reply.code(400).send({ error: 'Select a plan to continue.' })

    const count = await one<{ n: string }>('SELECT count(*)::text AS n FROM users')
    const userId = makeId('u')
    const now = new Date()
    const renewal = new Date(now)
    renewal.setDate(renewal.getDate() + (input.billingCycle === 'yearly' ? 365 : 30))

    const row = await one(
      `INSERT INTO users (id,name,email,phone,avatar_color,password_hash,check_in_pin,check_in_secret,member_since,last_password_change)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [
        userId, input.name, email, input.phone,
        AVATARS[Number(count?.n ?? 0) % AVATARS.length],
        await hashPassword(input.password),
        String(1000 + Math.floor(Math.random() * 9000)),
        makeSecretSalt(), now,
      ],
    )

    const homeLocation = await one<{ name: string }>('SELECT name FROM locations ORDER BY id LIMIT 1')
    await query(
      `INSERT INTO memberships (id,user_id,plan_id,status,billing_cycle,auto_renew,start_date,renewal_date,home_location)
       VALUES ($1,$2,$3,'active',$4,true,$5,$6,$7)`,
      [makeId('mem'), userId, plan.id, input.billingCycle, now, renewal, homeLocation?.name ?? ''],
    )

    await query(
      `INSERT INTO invoices (id,user_id,date,description,amount,status,method)
       VALUES ($1,$2,$3,$4,$5,'due','No payment method on file')`,
      [makeId('inv'), userId, now, `${plan.name} plan — ${input.billingCycle} membership`,
       input.billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly],
    )

    await query(
      `INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,'general',$3,$4)`,
      [makeId('ntf'), userId, `Welcome to FlexPass, ${input.name.split(' ')[0]}!`,
       `Your ${plan.name} membership is active. Add a payment method in Billing to cover your first invoice.`],
    )

    const { token, maxAge } = await createSession(userId, 'member', true)
    setSessionCookie(reply, MEMBER_COOKIE, token, maxAge, isHttps(req as any))
    return { user: toUser(row) }
  })

  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message })
    const { email, password, remember } = parsed.data

    const row = await one<any>('SELECT * FROM users WHERE lower(email) = $1', [email.toLowerCase()])
    // Same message either way — an attacker shouldn't learn which emails exist.
    if (!row || !(await checkPassword(row.password_hash, password))) {
      return reply.code(401).send({ error: 'Incorrect email or password.' })
    }
    const { token, maxAge } = await createSession(row.id, 'member', remember)
    setSessionCookie(reply, MEMBER_COOKIE, token, maxAge, isHttps(req as any))
    return { user: toUser(row) }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    await destroySession(req.cookies[MEMBER_COOKIE])
    clearSessionCookie(reply, MEMBER_COOKIE)
    return { ok: true }
  })

  /** Who am I? Drives the app's initial auth check on load. */
  app.get('/api/auth/me', async (req, reply) => {
    const user = await requireMember(req, reply)
    if (!user) return
    return { user }
  })

  app.post('/api/auth/password-reset/request', async (req, reply) => {
    const email = String((req.body as any)?.email ?? '').trim().toLowerCase()
    const row = await one<{ id: string }>('SELECT id FROM users WHERE lower(email) = $1', [email])
    if (!row) return { sent: true }
    const code = String(100000 + Math.floor(Math.random() * 900000))
    await query(
      `INSERT INTO password_resets (email, code, expires_at) VALUES ($1,$2, now() + interval '15 minutes')
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code],
    )
    // No mail transport wired up, so the code comes back in the response —
    // the one place this build knowingly stands in for infrastructure.
    return { sent: true, code }
  })

  app.post('/api/auth/password-reset/confirm', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      code: z.string().min(4),
      password: z.string().min(8, 'Use at least 8 characters.'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })

    const email = body.data.email.toLowerCase()
    const row = await one<{ code: string }>(
      'SELECT code FROM password_resets WHERE email = $1 AND expires_at > now()', [email],
    )
    if (!row || row.code !== body.data.code) {
      return reply.code(400).send({ error: 'That code is incorrect or has expired.' })
    }
    const user = await one<{ id: string }>('SELECT id FROM users WHERE lower(email) = $1', [email])
    if (!user) return reply.code(400).send({ error: 'That code is incorrect or has expired.' })

    await query('UPDATE users SET password_hash = $1, last_password_change = now() WHERE id = $2',
      [await hashPassword(body.data.password), user.id])
    await query('DELETE FROM password_resets WHERE email = $1', [email])
    // A password change ends every existing session — that's the point of one.
    await destroyAllSessions(user.id)
    return { ok: true }
  })

  // ---- staff ----

  app.post('/api/staff/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message })
    const { email, password, remember } = parsed.data

    const row = await one<any>('SELECT * FROM staff WHERE lower(email) = $1', [email.toLowerCase()])
    if (!row || !(await checkPassword(row.password_hash, password))) {
      return reply.code(401).send({ error: 'Incorrect email or password.' })
    }
    const { token, maxAge } = await createSession(row.id, 'staff', remember)
    setSessionCookie(reply, STAFF_COOKIE, token, maxAge, isHttps(req as any))
    return { staff: toStaff(row) }
  })

  app.post('/api/staff/logout', async (req, reply) => {
    await destroySession(req.cookies[STAFF_COOKIE])
    clearSessionCookie(reply, STAFF_COOKIE)
    return { ok: true }
  })

  app.get('/api/staff/me', async (req, reply) => {
    const staff = await requireStaff(req, reply)
    if (!staff) return
    return { staff }
  })
}
