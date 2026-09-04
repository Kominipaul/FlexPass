/**
 * The member's rotating check-in code.
 *
 * This is the endpoint that closes the hole the localStorage build had: the
 * signing key never leaves the server. The member's app asks for a token
 * each rotation window and renders the returned string as a QR. It cannot
 * mint a token for anyone — including itself — without asking.
 */
import type { FastifyInstance } from 'fastify'
import { one } from '../db.ts'
import { requireMember } from '../auth.ts'
import { ROTATE_SECONDS, secondsUntilRotation, signCheckInToken } from '../domain/tokens.ts'

export default async function checkinRoutes(app: FastifyInstance) {
  app.get('/api/checkin/token', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    const row = await one<{ check_in_secret: string }>('SELECT check_in_secret FROM users WHERE id = $1', [me.id])
    if (!row) return reply.code(404).send({ error: 'Member not found.' })
    return {
      token: signCheckInToken(me.id, row.check_in_secret),
      rotateSeconds: ROTATE_SECONDS,
      secondsLeft: secondsUntilRotation(),
      // The client shows a countdown; anchoring it to the server's clock
      // keeps the ring honest on a phone whose time is off.
      serverTime: new Date().toISOString(),
    }
  })

  /** The member's own 4-digit backup PIN, for the Membership Card screen. */
  app.get('/api/checkin/pin', async (req, reply) => {
    const me = await requireMember(req, reply); if (!me) return
    return { pin: me.security.checkInPin }
  })
}
