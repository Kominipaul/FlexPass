/**
 * Server-side check-in tokens.
 *
 * This is the half of src/lib/accessToken.ts that must never run in a
 * browser. The member's app no longer holds a signing key and no longer
 * signs anything: it asks POST /api/checkin/token and gets back a string to
 * render as a QR. The front desk posts that string to POST /api/admin/scan
 * and the server re-derives the signature. The key stays in this process.
 *
 * The token format is byte-identical to the one the client used to mint, so
 * the QR rendering and the jsQR decode path on the scanner are unchanged.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { env } from '../env.ts'

export const ROTATE_SECONDS = 60
const CLOCK_SKEW_SECONDS = 4
const TOKEN_VERSION = 'FP1'

export interface TokenClaim {
  uid: string
  iat: number
  exp: number
}

export type VerifyFailure = 'malformed' | 'bad_signature' | 'expired'
export type VerifyResult = { ok: true; claim: TokenClaim } | { ok: false; reason: VerifyFailure }

const b64url = (b: Buffer) => b.toString('base64url')

/**
 * Each member still gets their own key, so one member's leaked token can
 * never be turned into another's. The per-member key is derived from the
 * server secret plus the member's stored salt, so rotating
 * CHECKIN_SIGNING_KEY invalidates every outstanding code at once.
 */
function memberKey(uid: string, secretSalt: string): Buffer {
  return createHmac('sha256', env.checkInSigningKey).update(`${uid}:${secretSalt}`).digest()
}

export function makeSecretSalt(): string {
  return randomBytes(32).toString('hex')
}

export function currentWindowStart(nowMs: number = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return nowSec - (nowSec % ROTATE_SECONDS)
}

export function secondsUntilRotation(nowMs: number = Date.now()): number {
  return ROTATE_SECONDS - (Math.floor(nowMs / 1000) - currentWindowStart(nowMs))
}

export function signCheckInToken(uid: string, secretSalt: string, nowMs: number = Date.now()): string {
  const windowStart = currentWindowStart(nowMs)
  const claim: TokenClaim = { uid, iat: windowStart, exp: windowStart + ROTATE_SECONDS }
  const payload = b64url(Buffer.from(JSON.stringify(claim), 'utf8'))
  const sig = b64url(createHmac('sha256', memberKey(uid, secretSalt)).update(payload).digest())
  return `${TOKEN_VERSION}.${payload}.${sig}`
}

export function decodeTokenUnsafe(token: string): TokenClaim | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null
    const claim = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Partial<TokenClaim>
    if (typeof claim.uid !== 'string' || !claim.uid) return null
    if (typeof claim.iat !== 'number' || typeof claim.exp !== 'number') return null
    return claim as TokenClaim
  } catch {
    return null
  }
}

export function verifyCheckInToken(
  token: string,
  secretSalt: string,
  nowMs: number = Date.now(),
): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { ok: false, reason: 'malformed' }
  const claim = decodeTokenUnsafe(token)
  if (!claim) return { ok: false, reason: 'malformed' }

  const expected = Buffer.from(b64url(createHmac('sha256', memberKey(claim.uid, secretSalt)).update(parts[1]).digest()))
  const given = Buffer.from(parts[2])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'bad_signature' }
  }

  const nowSec = Math.floor(nowMs / 1000)
  if (nowSec < claim.iat - CLOCK_SKEW_SECONDS || nowSec > claim.exp + CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, claim }
}
