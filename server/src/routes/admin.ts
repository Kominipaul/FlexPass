/**
 * Front desk: the roster, the door, the backup keypad, the log.
 *
 * Every route here needs a staff session — a member's cookie will not do.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { one, query, tx } from '../db.ts'
import { makeId } from '../id.ts'
import { requireStaff } from '../auth.ts'
import {
  toActivity, toCheckIn, toClassBooking, toDoorScan, toGroupMembership,
  toMembership, toPinUnlock, toPlan, toUser,
} from '../mappers.ts'
import { evaluateAccess, type AccessResult } from '../domain/access.ts'
import { PIN_MAX_ATTEMPTS, PIN_WINDOW_MINUTES, pinAllowanceFrom } from '../domain/pinPolicy.ts'
import { decodeTokenUnsafe, verifyCheckInToken } from '../domain/tokens.ts'

/**
 * Writes the door decision to the log, and — only when it opened — the
 * check-in itself. A denial is still a real event with the member's name on
 * it; that's what makes a probed PIN visible.
 */
async function finalizeScan(
  userId: string | null, locationId: string, method: 'QR' | 'PIN', result: AccessResult,
) {
  const locationName = (await one<{ name: string }>('SELECT name FROM locations WHERE id = $1', [locationId]))?.name ?? locationId
  const scanRow = await one(
    `INSERT INTO door_scans (id,user_id,location_id,result,reason_code,method)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [makeId('scan'), userId, locationId, result.ok ? 'granted' : 'denied', result.reasonCode, method],
  )
  if (result.ok && userId) {
    await query('INSERT INTO check_ins (id,user_id,location,method) VALUES ($1,$2,$3,$4)',
      [makeId('chk'), userId, locationName, method])
  }
  return toDoorScan(scanRow)
}

async function membershipAndPlan(userId: string) {
  const m = await one<any>('SELECT * FROM memberships WHERE user_id = $1', [userId])
  if (!m) return null
  const p = await one<any>('SELECT * FROM plans WHERE id = $1', [m.plan_id])
  if (!p) return null
  const home = await one<{ id: string }>('SELECT id FROM locations WHERE name = $1', [m.home_location])
  return { membership: toMembership(m), plan: toPlan(p), homeLocationId: home?.id ?? '' }
}

export default async function adminRoutes(app: FastifyInstance) {
  app.get('/api/admin/members', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const rows = await query(
      `SELECT u.*, m.id AS m_id, m.plan_id, m.status AS m_status, m.billing_cycle, m.auto_renew,
              m.start_date, m.renewal_date, m.home_location, m.freeze_history
       FROM memberships m JOIN users u ON u.id = m.user_id ORDER BY u.name`,
    )
    const plans = new Map((await query('SELECT * FROM plans')).map((p: any) => [p.id, toPlan(p)]))
    const members = rows.flatMap((r: any) => {
      const plan = plans.get(r.plan_id)
      if (!plan) return []
      return [{
        user: toUser(r),
        membership: toMembership({
          id: r.m_id, user_id: r.id, plan_id: r.plan_id, status: r.m_status,
          billing_cycle: r.billing_cycle, auto_renew: r.auto_renew, start_date: r.start_date,
          renewal_date: r.renewal_date, home_location: r.home_location, freeze_history: r.freeze_history,
        }),
        plan,
      }]
    })
    return { members }
  })

  app.get('/api/admin/check-ins', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const rows = await query('SELECT * FROM check_ins ORDER BY timestamp DESC LIMIT 500')
    return { checkIns: rows.map(toCheckIn) }
  })

  app.get('/api/admin/bookings', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    return { bookings: (await query('SELECT * FROM class_bookings')).map(toClassBooking) }
  })

  app.get('/api/admin/groups', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    return { groups: (await query('SELECT * FROM group_memberships')).map(toGroupMembership) }
  })

  app.get('/api/admin/door-scans', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const rows = await query('SELECT * FROM door_scans ORDER BY timestamp DESC LIMIT 200')
    return { doorScans: rows.map(toDoorScan) }
  })

  app.post('/api/admin/members/:id/extend', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const days = Number((req.body as any)?.days ?? 0)
    if (!Number.isFinite(days) || days === 0) return reply.code(400).send({ error: 'Enter a number of days.' })
    const row = await one(
      `UPDATE memberships SET renewal_date = GREATEST(renewal_date, now()) + ($2 || ' days')::interval,
         status = CASE WHEN status = 'cancelled' THEN 'active' ELSE status END
       WHERE user_id = $1 RETURNING *`,
      [(req.params as any).id, String(days)],
    )
    if (!row) return reply.code(404).send({ error: 'Membership not found.' })
    await query('INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,$3,$4,$5)',
      [makeId('ntf'), (req.params as any).id, 'renewal', 'Membership extended',
       `The front desk extended your membership by ${days} days.`])
    return { membership: toMembership(row) }
  })

  app.post('/api/admin/members/:id/frozen', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const frozen = Boolean((req.body as any)?.frozen)
    const row = await one(`UPDATE memberships SET status = $2 WHERE user_id = $1 RETURNING *`,
      [(req.params as any).id, frozen ? 'frozen' : 'active'])
    if (!row) return reply.code(404).send({ error: 'Membership not found.' })
    return { membership: toMembership(row) }
  })

  // ---- activities ----

  app.post('/api/admin/activities', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const body = z.object({
      kind: z.enum(['class', 'group']), name: z.string().trim().min(2), category: z.string().trim().min(1),
      instructor: z.string().trim().min(2), location: z.string().trim().min(1), locationId: z.string(),
      level: z.enum(['All levels', 'Beginner', 'Intermediate', 'Advanced']),
      description: z.string().default(''), capacity: z.number().int().min(1), color: z.string().default('volt'),
      schedule: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), durationMins: z.number().int().min(5),
      })).min(1, 'Add at least one time slot.'),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0].message })
    const a = body.data

    const row = await one(
      `INSERT INTO activities (id,kind,name,category,instructor,location,location_id,level,description,capacity,color,schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [makeId('act'), a.kind, a.name, a.category, a.instructor, a.location, a.locationId,
       a.level, a.description, a.capacity, a.color, JSON.stringify(a.schedule)],
    )
    return { activity: toActivity(row) }
  })

  app.delete('/api/admin/activities/:id', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const id = (req.params as any).id
    const activity = await one<any>('SELECT * FROM activities WHERE id = $1', [id])
    if (!activity) return reply.code(404).send({ error: 'Class not found.' })

    // Everyone holding a live booking or an active group seat gets told,
    // before the rows are cleared by the cascade.
    const affected = await query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM class_bookings WHERE activity_id = $1 AND status IN ('booked','waitlisted')
       UNION SELECT DISTINCT user_id FROM group_memberships WHERE activity_id = $1 AND status = 'active'`,
      [id],
    )
    for (const r of affected) {
      await query('INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,$3,$4,$5)',
        [makeId('ntf'), r.user_id, 'class', `${activity.name} was cancelled`,
         `${activity.name} with ${activity.instructor} has been removed from the schedule. Any bookings or group membership were cleared automatically.`])
    }
    await query('DELETE FROM activities WHERE id = $1', [id])
    return { notified: affected.length }
  })

  // ---- the door ----

  /**
   * The camera path. Verifies the QR's signature against the claimed
   * member's server-held key before any membership rule runs, so a forged
   * code, a screenshot of someone else's screen, or a stale rotation all
   * fail here — and are still logged against whoever they claimed to be.
   */
  app.post('/api/admin/scan', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const body = z.object({ token: z.string().min(1), locationId: z.string().min(1) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: "That's not a FlexPass code." })

    const claim = decodeTokenUnsafe(body.data.token)
    if (!claim) return reply.code(400).send({ error: "That's not a FlexPass code." })

    const userRow = await one<any>('SELECT * FROM users WHERE id = $1', [claim.uid])
    if (!userRow) return reply.code(404).send({ error: 'This code does not match any member.' })

    const mp = await membershipAndPlan(userRow.id)
    if (!mp) return reply.code(404).send({ error: 'This member has no active membership on file.' })

    const verified = verifyCheckInToken(body.data.token, userRow.check_in_secret)
    const result: AccessResult = verified.ok
      ? evaluateAccess(mp.membership, mp.plan, body.data.locationId, mp.homeLocationId)
      : { ok: false, reasonCode: verified.reason === 'expired' ? 'code_expired' : 'code_invalid' }

    const scan = await finalizeScan(userRow.id, body.data.locationId, 'QR', result)
    return { scan, user: toUser(userRow), membership: mp.membership, plan: mp.plan, daysLeft: result.daysLeft }
  })

  // ---- backup PIN ----

  app.get('/api/admin/pin-unlocks', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    // An 'open' window whose clock ran out reads as 'expired' without needing
    // a timer anywhere to write that transition.
    await query(`UPDATE pin_unlocks SET status = 'expired' WHERE status = 'open' AND expires_at <= now()`)
    const rows = await query('SELECT * FROM pin_unlocks ORDER BY opened_at DESC LIMIT 100')
    return { pinUnlocks: rows.map(toPinUnlock) }
  })

  app.get('/api/admin/members/:id/pin-allowance', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const rows = await query('SELECT * FROM check_ins WHERE user_id = $1', [(req.params as any).id])
    return { allowance: pinAllowanceFrom(rows.map(toCheckIn)) }
  })

  app.post('/api/admin/pin-unlocks', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const body = z.object({
      userId: z.string(), locationId: z.string(), override: z.boolean().default(false),
    }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Pick a member first.' })

    const user = await one('SELECT id FROM users WHERE id = $1', [body.data.userId])
    if (!user) return reply.code(404).send({ error: 'Member not found.' })

    const checkIns = (await query('SELECT * FROM check_ins WHERE user_id = $1', [body.data.userId])).map(toCheckIn)
    const allowance = pinAllowanceFrom(checkIns)
    if (allowance.overLimit && !body.data.override) {
      return reply.code(403).send({
        error: `This member has used all ${allowance.limit} backup entries in the last ${allowance.windowDays} days.`,
        needsOverride: true, allowance,
      })
    }

    const row = await tx(async (c) => {
      // One open window per desk at a time, so the keypad is never ambiguous
      // about who it belongs to.
      await c.query(`UPDATE pin_unlocks SET status = 'cancelled' WHERE location_id = $1 AND status = 'open'`, [body.data.locationId])
      const res = await c.query(
        `INSERT INTO pin_unlocks (id,user_id,location_id,staff_id,expires_at,attempts_left,override,status)
         VALUES ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval, $6,$7,'open') RETURNING *`,
        [makeId('pin'), body.data.userId, body.data.locationId, staff.id,
         String(PIN_WINDOW_MINUTES), PIN_MAX_ATTEMPTS, body.data.override],
      )
      return res.rows[0]
    })
    return { unlock: toPinUnlock(row) }
  })

  app.post('/api/admin/pin-unlocks/:id/cancel', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    await query(`UPDATE pin_unlocks SET status = 'cancelled' WHERE id = $1 AND status = 'open'`, [(req.params as any).id])
    return { ok: true }
  })

  app.post('/api/admin/pin-unlocks/:id/attempt', async (req, reply) => {
    const staff = await requireStaff(req, reply); if (!staff) return
    const pin = String((req.body as any)?.pin ?? '').trim()
    const id = (req.params as any).id

    const unlock = await one<any>('SELECT * FROM pin_unlocks WHERE id = $1', [id])
    if (!unlock) return reply.code(404).send({ error: 'That PIN window no longer exists.' })
    if (unlock.status === 'open' && new Date(unlock.expires_at).getTime() <= Date.now()) {
      await query(`UPDATE pin_unlocks SET status = 'expired' WHERE id = $1`, [id])
      return reply.code(400).send({ error: 'That PIN window timed out. Open a new one.' })
    }
    if (unlock.status !== 'open') return reply.code(400).send({ error: 'That PIN window is already closed.' })

    const userRow = await one<any>('SELECT * FROM users WHERE id = $1', [unlock.user_id])
    if (!userRow) return reply.code(404).send({ error: 'Member not found.' })
    const mp = await membershipAndPlan(userRow.id)
    if (!mp) return reply.code(404).send({ error: 'This member has no active membership on file.' })

    if (pin.length === 0 || pin !== userRow.check_in_pin) {
      const attemptsLeft = Math.max(0, unlock.attempts_left - 1)
      const next = await one(
        `UPDATE pin_unlocks SET attempts_left = $2, status = $3 WHERE id = $1 RETURNING *`,
        [id, attemptsLeft, attemptsLeft <= 0 ? 'locked' : 'open'],
      )
      const scan = await finalizeScan(userRow.id, unlock.location_id, 'PIN', { ok: false, reasonCode: 'pin_incorrect' })
      return { ok: false, reason: 'wrong_pin', unlock: toPinUnlock(next), user: toUser(userRow), scan }
    }

    const next = await one(`UPDATE pin_unlocks SET status = 'used' WHERE id = $1 RETURNING *`, [id])
    const result = evaluateAccess(mp.membership, mp.plan, unlock.location_id, mp.homeLocationId)
    const scan = await finalizeScan(userRow.id, unlock.location_id, 'PIN', result)
    return {
      ok: true, scan, user: toUser(userRow), membership: mp.membership,
      plan: mp.plan, unlock: toPinUnlock(next), daysLeft: result.daysLeft,
    }
  })
}
