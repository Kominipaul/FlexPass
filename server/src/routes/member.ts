/** Everything the signed-in member can read or change about themselves. */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { one, query, tx } from '../db.ts'
import { makeId } from '../id.ts'
import {
  toCheckIn, toInvoice, toMembership, toNotification, toPaymentMethod, toTrainingGoal, toUser,
} from '../mappers.ts'
import { isWeakPin, pinAllowanceFrom } from '../domain/pinPolicy.ts'
import { NOTIFICATION_TTL_DAYS } from '../domain/notificationPolicy.ts'
import { MEMBER_COOKIE, checkPassword, clearSessionCookie, destroyAllSessions, hashPassword, requireMember } from '../auth.ts'

async function notify(userId: string, type: string, title: string, message: string) {
  await query('INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,$3,$4,$5)',
    [makeId('ntf'), userId, type, title, message])
}

export default async function memberRoutes(app: FastifyInstance) {
  // ---- profile & security ----

  app.patch('/api/me/profile', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({
      name: z.string().trim().min(2).optional(),
      phone: z.string().trim().optional(),
      dob: z.string().optional(),
      address: z.string().optional(),
      emergencyContact: z.object({ name: z.string(), phone: z.string(), relationship: z.string() }).optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    const p = body.data

    const row = await one(
      `UPDATE users SET name = COALESCE($2,name), phone = COALESCE($3,phone), dob = COALESCE($4,dob),
         address = COALESCE($5,address), emergency_contact = COALESCE($6,emergency_contact)
       WHERE id = $1 RETURNING *`,
      [me.id, p.name ?? null, p.phone ?? null, p.dob ?? null, p.address ?? null,
       p.emergencyContact ? JSON.stringify(p.emergencyContact) : null],
    )
    return { user: toUser(row) }
  })

  app.post('/api/me/password', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({
      current: z.string().min(1),
      next: z.string().min(8, 'Use at least 8 characters.'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })

    const row = await one<any>('SELECT password_hash FROM users WHERE id = $1', [me.id])
    if (!row || !(await checkPassword(row.password_hash, body.data.current))) {
      return reply.code(400).send({ error: 'Your current password is incorrect.' })
    }
    await query('UPDATE users SET password_hash = $1, last_password_change = now() WHERE id = $2',
      [await hashPassword(body.data.next), me.id])
    await notify(me.id, 'security', 'Password changed', 'Your password was updated. If this wasn\'t you, contact the front desk.')
    return { ok: true }
  })

  app.post('/api/me/two-factor', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const enabled = Boolean((req.body as any)?.enabled)
    const row = await one('UPDATE users SET two_factor_enabled = $2 WHERE id = $1 RETURNING *', [me.id, enabled])
    return { user: toUser(row) }
  })

  /**
   * Sets the member's backup PIN — to a value they choose, or, with no `pin`
   * in the body, to a random one (the "generate one for me" path). Either
   * way it's the member deciding, and either way they can call this again
   * later to change it; there's no separate "first time" step.
   */
  app.post('/api/me/checkin-pin', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({
      pin: z.string().regex(/^\d{4}$/, 'Use exactly 4 digits.').optional(),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })

    let pin = body.data.pin
    if (pin) {
      if (isWeakPin(pin)) {
        return reply.code(400).send({ error: "Choose 4 digits that aren't all the same or a simple run like 1234." })
      }
    } else {
      do {
        pin = String(1000 + Math.floor(Math.random() * 9000))
      } while (isWeakPin(pin))
    }

    await query('UPDATE users SET check_in_pin = $2 WHERE id = $1', [me.id, pin])
    await notify(me.id, 'security', 'Backup PIN changed', 'Your door backup PIN was changed from your account settings.')
    return { pin }
  })

  app.delete('/api/me', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    // ON DELETE CASCADE clears memberships, bookings, check-ins, invoices,
    // cards, notifications, pin_unlocks and the training goal in one go.
    await destroyAllSessions(me.id)
    await query('DELETE FROM users WHERE id = $1', [me.id])
    clearSessionCookie(reply, MEMBER_COOKIE)
    return { ok: true }
  })

  // ---- membership ----

  app.get('/api/me/membership', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one('SELECT * FROM memberships WHERE user_id = $1', [me.id])
    return { membership: row ? toMembership(row) : null }
  })

  // Plan changes bill a different amount, and there is no online payment
  // provider wired up (see README "What's stubbed") to actually collect it —
  // this used to update the membership and drop a 'due' invoice nobody ever
  // paid, which let a member "upgrade" to a pricier plan for free. Until a
  // real payment flow exists, only the front desk can do this, after taking
  // payment in person: POST /api/admin/members/:id/plan.
  app.post('/api/me/membership/plan', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    return reply.code(403).send({
      error: 'Plan changes go through the front desk for now — we don\'t take payment online yet.',
    })
  })

  app.post('/api/me/membership/auto-renew', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one('UPDATE memberships SET auto_renew = $2 WHERE user_id = $1 RETURNING *',
      [me.id, Boolean((req.body as any)?.autoRenew)])
    return { membership: toMembership(row) }
  })

  app.post('/api/me/membership/freeze', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({ days: z.number().int().min(1).max(90), reason: z.string().default('') }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Choose how long to freeze for.' })

    const current = await one<any>('SELECT * FROM memberships WHERE user_id = $1', [me.id])
    if (!current) return reply.code(404).send({ error: 'Membership not found.' })
    if (current.status === 'frozen') return reply.code(400).send({ error: 'Your membership is already frozen.' })

    const start = new Date()
    const end = new Date(Date.now() + body.data.days * 86400000)
    // A freeze pushes the renewal date out by the same span — the member
    // doesn't lose the days they paid for.
    const renewal = new Date(new Date(current.renewal_date).getTime() + body.data.days * 86400000)
    const record = { id: makeId('frz'), startDate: start.toISOString(), endDate: end.toISOString(), reason: body.data.reason }

    const row = await one(
      `UPDATE memberships SET status = 'frozen', renewal_date = $2,
         freeze_history = freeze_history || $3::jsonb WHERE user_id = $1 RETURNING *`,
      [me.id, renewal, JSON.stringify([record])],
    )
    await notify(me.id, 'renewal', 'Membership frozen', `Frozen until ${end.toLocaleDateString()}. Your renewal date moved out by ${body.data.days} days.`)
    return { membership: toMembership(row) }
  })

  app.post('/api/me/membership/unfreeze', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one(`UPDATE memberships SET status = 'active' WHERE user_id = $1 RETURNING *`, [me.id])
    await notify(me.id, 'renewal', 'Membership unfrozen', 'Welcome back — your membership is active again.')
    return { membership: toMembership(row) }
  })

  app.post('/api/me/membership/cancel', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const immediate = Boolean((req.body as any)?.immediate)
    const row = await one(
      `UPDATE memberships SET status = $2, auto_renew = false,
         renewal_date = CASE WHEN $3 THEN now() ELSE renewal_date END
       WHERE user_id = $1 RETURNING *`,
      [me.id, immediate ? 'cancelled' : 'pending_cancellation', immediate],
    )
    await notify(me.id, 'renewal', 'Membership cancelled',
      immediate ? 'Your membership has ended. You can reactivate any time.'
                : 'Your membership will end on your renewal date. Until then everything works as normal.')
    return { membership: toMembership(row) }
  })

  // Reactivating resumes billing on a membership that had stopped being
  // paid for — the same online-payment gap as plan changes above, and it
  // used to happen with no invoice at all. Staff reactivate from the front
  // desk after taking payment: POST /api/admin/members/:id/reactivate.
  app.post('/api/me/membership/reactivate', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    return reply.code(403).send({
      error: 'Reactivating your membership goes through the front desk for now — we don\'t take payment online yet.',
    })
  })

  // ---- check-in history, allowance, training goal ----

  app.get('/api/me/check-ins', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM check_ins WHERE user_id = $1 ORDER BY timestamp DESC', [me.id])
    return { checkIns: rows.map(toCheckIn) }
  })

  app.get('/api/me/pin-allowance', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM check_ins WHERE user_id = $1', [me.id])
    return { allowance: pinAllowanceFrom(rows.map(toCheckIn)) }
  })

  app.get('/api/me/training-goal', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one('SELECT * FROM training_goals WHERE user_id = $1', [me.id])
    if (row) return { goal: toTrainingGoal(row) }
    return { goal: { userId: me.id, daysPerWeek: 3, restDays: [], enabled: true, startedAt: new Date().toISOString() } }
  })

  app.put('/api/me/training-goal', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({
      daysPerWeek: z.number().int().min(1).max(7),
      restDays: z.array(z.number().int().min(0).max(6)).default([]),
      enabled: z.boolean().default(true),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Pick between 1 and 7 days a week.' })

    const row = await one(
      `INSERT INTO training_goals (user_id, days_per_week, rest_days, enabled) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET days_per_week = EXCLUDED.days_per_week,
         rest_days = EXCLUDED.rest_days, enabled = EXCLUDED.enabled RETURNING *`,
      [me.id, body.data.daysPerWeek, body.data.restDays, body.data.enabled],
    )
    return { goal: toTrainingGoal(row) }
  })

  // ---- billing ----

  app.get('/api/me/invoices', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY date DESC', [me.id])
    return { invoices: rows.map(toInvoice) }
  })

  app.get('/api/me/payment-methods', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, id', [me.id])
    return { paymentMethods: rows.map(toPaymentMethod) }
  })

  app.post('/api/me/payment-methods', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({
      brand: z.enum(['Visa', 'Mastercard', 'Amex']),
      last4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits.'),
      expMonth: z.number().int().min(1).max(12),
      expYear: z.number().int().min(new Date().getFullYear()),
      nameOnCard: z.string().trim().min(2, 'Enter the name on the card.'),
      makeDefault: z.boolean().default(false),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    const d = body.data

    const created = await tx(async (c) => {
      const existing = await c.query('SELECT count(*)::int AS n FROM payment_methods WHERE user_id = $1', [me.id])
      const isFirst = existing.rows[0].n === 0
      const makeDefault = d.makeDefault || isFirst
      if (makeDefault) {
        await c.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [me.id])
      }
      const res = await c.query(
        `INSERT INTO payment_methods (id,user_id,brand,last4,exp_month,exp_year,is_default,name_on_card)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [makeId('pm'), me.id, d.brand, d.last4, d.expMonth, d.expYear, makeDefault, d.nameOnCard],
      )
      return res.rows[0]
    })
    return { paymentMethod: toPaymentMethod(created) }
  })

  app.delete('/api/me/payment-methods/:id', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const id = (req.params as any).id
    await tx(async (c) => {
      const res = await c.query('DELETE FROM payment_methods WHERE id = $1 AND user_id = $2 RETURNING is_default', [id, me.id])
      // Removing the default promotes another card, so the member is never
      // left with cards but nothing to charge.
      if (res.rows[0]?.is_default) {
        await c.query(
          `UPDATE payment_methods SET is_default = true WHERE id = (
             SELECT id FROM payment_methods WHERE user_id = $1 ORDER BY id LIMIT 1)`,
          [me.id],
        )
      }
    })
    return { ok: true }
  })

  app.post('/api/me/payment-methods/:id/default', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const id = (req.params as any).id
    await tx(async (c) => {
      await c.query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [me.id])
      await c.query('UPDATE payment_methods SET is_default = true WHERE id = $1 AND user_id = $2', [id, me.id])
    })
    return { ok: true }
  })

  app.post('/api/me/invoices/:id/pay', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const id = (req.params as any).id
    const card = await one<any>('SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC LIMIT 1', [me.id])
    if (!card) return reply.code(400).send({ error: 'Add a payment method first.' })

    const row = await one(
      `UPDATE invoices SET status = 'paid', method = $3 WHERE id = $1 AND user_id = $2 AND status <> 'paid' RETURNING *`,
      [id, me.id, `${card.brand} ending ${card.last4}`],
    )
    if (!row) return reply.code(400).send({ error: 'That invoice is not payable.' })
    return { invoice: toInvoice(row) }
  })

  // ---- notifications ----

  app.get('/api/me/notifications', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    // Swept lazily on read rather than by a scheduled job — the same
    // pattern an expired PIN window uses above. Global, not scoped to this
    // member: whoever happens to load their notifications first pays for
    // clearing everyone's stale rows, which is cheap and keeps the table
    // from growing forever without needing any background process at all.
    await query(`DELETE FROM notifications WHERE created_at <= now() - ($1 || ' days')::interval`, [String(NOTIFICATION_TTL_DAYS)])
    const rows = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [me.id])
    return { notifications: rows.map(toNotification) }
  })

  app.post('/api/me/notifications/:id/read', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    await query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [(req.params as any).id, me.id])
    return { ok: true }
  })

  app.post('/api/me/notifications/read-all', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    await query('UPDATE notifications SET read = true WHERE user_id = $1', [me.id])
    return { ok: true }
  })

  // A member's own notifications are theirs to clear — nothing else in the
  // app reads them back once gone, so deleting one is just that, not a
  // "soft delete" hiding a row someone else still needs.
  app.delete('/api/me/notifications/:id', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [(req.params as any).id, me.id])
    return { ok: true }
  })

  app.delete('/api/me/notifications', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    await query('DELETE FROM notifications WHERE user_id = $1', [me.id])
    return { ok: true }
  })
}
