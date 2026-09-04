/** Public reference data + the member's class bookings and group memberships. */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { one, query, tx } from '../db.ts'
import { makeId } from '../id.ts'
import { toActivity, toClassBooking, toGroupMembership, toLocation, toPlan } from '../mappers.ts'
import { requireMember } from '../auth.ts'

async function notify(userId: string, title: string, message: string) {
  await query('INSERT INTO notifications (id,user_id,type,title,message) VALUES ($1,$2,$3,$4,$5)',
    [makeId('ntf'), userId, 'class', title, message])
}

export default async function classRoutes(app: FastifyInstance) {
  // Public — the signup form needs plans before anyone is signed in.
  app.get('/api/plans', async () => {
    const rows = await query('SELECT * FROM plans ORDER BY sort_order')
    return { plans: rows.map(toPlan) }
  })

  app.get('/api/locations', async () => {
    const rows = await query('SELECT * FROM locations ORDER BY id')
    return { locations: rows.map(toLocation) }
  })

  app.get('/api/activities', async () => {
    const rows = await query('SELECT * FROM activities ORDER BY name')
    return { activities: rows.map(toActivity) }
  })

  /** Booked headcount per occurrence, so the UI can show real spots-left. */
  app.get('/api/activities/:id/booking-counts', async (req) => {
    const rows = await query<{ date: Date; n: string }>(
      `SELECT date, count(*)::text AS n FROM class_bookings
       WHERE activity_id = $1 AND status = 'booked' GROUP BY date`,
      [(req.params as any).id],
    )
    const counts: Record<string, number> = {}
    for (const r of rows) counts[new Date(r.date).toISOString()] = Number(r.n)
    return { counts }
  })

  app.get('/api/activities/:id/roster-size', async (req) => {
    const row = await one<{ n: string }>(
      `SELECT count(*)::text AS n FROM group_memberships WHERE activity_id = $1 AND status = 'active'`,
      [(req.params as any).id],
    )
    return { size: Number(row?.n ?? 0) }
  })

  // ---- bookings ----

  app.get('/api/me/bookings', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM class_bookings WHERE user_id = $1 ORDER BY date DESC', [me.id])
    return { bookings: rows.map(toClassBooking) }
  })

  app.post('/api/me/bookings', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const body = z.object({ activityId: z.string(), date: z.string() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Pick a session to book.' })
    const { activityId, date } = body.data

    const activity = await one<any>('SELECT * FROM activities WHERE id = $1', [activityId])
    if (!activity) return reply.code(404).send({ error: 'Class not found.' })

    let created: any
    try {
      created = await tx(async (c) => {
        // Lock the activity row so two members booking the last seat at the
        // same instant can't both be told they're 'booked'.
        await c.query('SELECT id FROM activities WHERE id = $1 FOR UPDATE', [activityId])

        const dup = await c.query(
          `SELECT id FROM class_bookings WHERE user_id = $1 AND activity_id = $2 AND date = $3
             AND status IN ('booked','waitlisted')`,
          [me.id, activityId, date],
        )
        if (dup.rows.length) throw new Error('ALREADY_BOOKED')

        const taken = await c.query(
          `SELECT count(*)::int AS n FROM class_bookings WHERE activity_id = $1 AND date = $2 AND status = 'booked'`,
          [activityId, date],
        )
        const status = taken.rows[0].n >= activity.capacity ? 'waitlisted' : 'booked'
        const res = await c.query(
          `INSERT INTO class_bookings (id,user_id,activity_id,date,status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [makeId('bk'), me.id, activityId, date, status],
        )
        return res.rows[0]
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_BOOKED') {
        return reply.code(409).send({ error: "You're already booked into this session." })
      }
      throw err
    }

    const when = new Date(date).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    await notify(me.id,
      created.status === 'booked' ? `You're booked: ${activity.name}` : `Waitlisted: ${activity.name}`,
      created.status === 'booked'
        ? `See you at ${activity.location} — ${when}.`
        : `${activity.name} is full. We'll notify you if a spot opens up.`)

    return { booking: toClassBooking(created) }
  })

  app.delete('/api/me/bookings/:id', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one(
      `UPDATE class_bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [(req.params as any).id, me.id],
    )
    if (!row) return reply.code(404).send({ error: 'Booking not found.' })
    return { ok: true }
  })

  // ---- groups ----

  app.get('/api/me/groups', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const rows = await query('SELECT * FROM group_memberships WHERE user_id = $1', [me.id])
    return { groups: rows.map(toGroupMembership) }
  })

  app.post('/api/me/groups', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const activityId = String((req.body as any)?.activityId ?? '')
    const activity = await one<any>('SELECT * FROM activities WHERE id = $1', [activityId])
    if (!activity) return reply.code(404).send({ error: 'Group not found.' })

    const existing = await one<any>('SELECT * FROM group_memberships WHERE user_id = $1 AND activity_id = $2', [me.id, activityId])
    if (existing?.status === 'active') return reply.code(409).send({ error: "You're already a member of this group." })

    // Rejoining reuses the original row rather than stacking duplicates.
    const row = existing
      ? await one(`UPDATE group_memberships SET status = 'active', joined_at = now() WHERE id = $1 RETURNING *`, [existing.id])
      : await one(`INSERT INTO group_memberships (id,user_id,activity_id,status) VALUES ($1,$2,$3,'active') RETURNING *`,
          [makeId('gm'), me.id, activityId])

    await notify(me.id, `You joined ${activity.name}`,
      `You're now part of the ${activity.name} group with ${activity.instructor}. Meets weekly at ${activity.location}.`)
    return { group: toGroupMembership(row) }
  })

  app.delete('/api/me/groups/:id', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one(`UPDATE group_memberships SET status = 'left' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [(req.params as any).id, me.id])
    if (!row) return reply.code(404).send({ error: 'Group membership not found.' })
    return { ok: true }
  })
}
