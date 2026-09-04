/**
 * Passwords and sessions.
 *
 * Passwords are argon2id. Sessions are opaque 32-byte random tokens sent as
 * an HttpOnly cookie; only their SHA-256 is stored, so this table leaking
 * does not let anyone resume a session. Members and staff use separate
 * cookies so one browser can hold both at once — which is exactly the demo
 * setup: the member app in one tab, the front desk in another.
 */
import argon2 from 'argon2'
import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { one, query } from './db.ts'
import { env } from './env.ts'
import { toStaff, toUser } from './mappers.ts'
import type { StaffUser, User } from '../../src/types/index.ts'

export const MEMBER_COOKIE = 'fp_session'
export const STAFF_COOKIE = 'fp_staff_session'

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id })
}

export async function checkPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export async function createSession(subjectId: string, kind: 'member' | 'staff', remember: boolean): Promise<{ token: string; maxAge: number }> {
  const token = randomBytes(32).toString('base64url')
  // Not remembered = a session cookie that dies with the tab, but the row
  // still needs a hard expiry so abandoned sessions don't accumulate.
  const days = remember ? env.sessionTtlDays : 1
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await query(
    'INSERT INTO sessions (token_hash, subject_id, kind, expires_at) VALUES ($1,$2,$3,$4)',
    [sha256(token), subjectId, kind, expiresAt],
  )
  return { token, maxAge: remember ? days * 24 * 60 * 60 : 0 }
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)])
}

export async function destroyAllSessions(subjectId: string): Promise<void> {
  await query('DELETE FROM sessions WHERE subject_id = $1', [subjectId])
}

async function subjectFor(token: string | undefined, kind: 'member' | 'staff'): Promise<string | null> {
  if (!token) return null
  const row = await one<{ subject_id: string }>(
    'SELECT subject_id FROM sessions WHERE token_hash = $1 AND kind = $2 AND expires_at > now()',
    [sha256(token), kind],
  )
  return row?.subject_id ?? null
}

export function setSessionCookie(reply: FastifyReply, name: string, token: string, maxAge: number, secure: boolean): void {
  reply.setCookie(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    ...(maxAge > 0 ? { maxAge } : {}),
  })
}

export function clearSessionCookie(reply: FastifyReply, name: string): void {
  reply.clearCookie(name, { path: '/' })
}

/** 401s unless a live member session cookie is present. */
export async function requireMember(req: FastifyRequest, reply: FastifyReply): Promise<User | null> {
  const id = await subjectFor(req.cookies[MEMBER_COOKIE], 'member')
  if (!id) {
    reply.code(401).send({ error: 'Not signed in.' })
    return null
  }
  const row = await one('SELECT * FROM users WHERE id = $1', [id])
  if (!row) {
    reply.code(401).send({ error: 'Not signed in.' })
    return null
  }
  return toUser(row)
}

/** 401s unless a live staff session cookie is present. */
export async function requireStaff(req: FastifyRequest, reply: FastifyReply): Promise<StaffUser | null> {
  const id = await subjectFor(req.cookies[STAFF_COOKIE], 'staff')
  if (!id) {
    reply.code(401).send({ error: 'Not signed in.' })
    return null
  }
  const row = await one('SELECT * FROM staff WHERE id = $1', [id])
  if (!row) {
    reply.code(401).send({ error: 'Not signed in.' })
    return null
  }
  return toStaff(row)
}

/** The raw row, secret column included — for the two places that legitimately need it. */
export async function memberRow(userId: string) {
  return one('SELECT * FROM users WHERE id = $1', [userId])
}
