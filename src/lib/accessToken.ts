/**
 * Real, verifiable rotating check-in tokens.
 *
 * This is what the member's QR code / Membership Card PIN actually encode,
 * and what the front-desk scanner actually verifies — genuine HMAC-SHA256
 * signing via the browser's SubtleCrypto, a compact JWT-style token, a
 * short rotation window, and a timing-safe signature comparison. Nothing
 * here is a visual placeholder: sign a token, hand the string to a real QR
 * encoder (see lib/qr.ts), and a real decoder (jsQR) reading it back off a
 * camera gets exactly this string back.
 *
 * The one honest limit: with no backend yet (see README), the signing key
 * for each member lives in the same client-side store the member's own app
 * reads it from (`User.security.checkInSecret`), instead of on a server
 * that only ever *verifies* and never *holds* a key the client can read.
 * A production build swaps that one thing — move signing server-side,
 * have the client ask for a signed token instead of making one — without
 * changing this token format, the QR rendering, or the scanner at all.
 */

/** Rotation window, in seconds. A code is valid for exactly one window, plus a small grace period for scan latency / clock skew. */
export const ROTATE_SECONDS = 20
/** Extra seconds of tolerance on either edge of the window, so a code scanned right as it rotates isn't unfairly rejected. */
const CLOCK_SKEW_SECONDS = 4
/** Format tag, bumped if the token shape ever changes — lets verify() reject tokens from an incompatible version outright. */
const TOKEN_VERSION = 'FP1'

export interface TokenClaim {
  /** The member's user id — whose stored secret should be used to verify this token. */
  uid: string
  /** Rotation window start, unix seconds. */
  iat: number
  /** Rotation window end, unix seconds. */
  exp: number
}

export type VerifyFailureReason = 'malformed' | 'bad_signature' | 'expired'
export type VerifyResult = { ok: true; claim: TokenClaim } | { ok: false; reason: VerifyFailureReason }

// ---------------------------------------------------------------------------
// base64url + UTF-8 helpers (no Buffer — this runs in the browser)
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder()

// ---------------------------------------------------------------------------
// HMAC-SHA256 via SubtleCrypto
// ---------------------------------------------------------------------------

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Web Crypto is unavailable. FlexPass check-in codes require a secure context (https:// or localhost).',
    )
  }
  return crypto.subtle
}

async function hmacSign(secret: string, message: string): Promise<Uint8Array> {
  const key = await subtle().importKey('raw', utf8Encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const sig = await subtle().sign('HMAC', key, utf8Encoder.encode(message))
  return new Uint8Array(sig)
}

/** Constant-time string comparison — avoids leaking signature-match progress through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---------------------------------------------------------------------------
// Secret generation (per member, generated once at signup/seed time)
// ---------------------------------------------------------------------------

/** A fresh 256-bit random signing key, hex-encoded. Cryptographically random — not Math.random(). */
export function makeCheckInSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Rotation window helpers
// ---------------------------------------------------------------------------

export function currentWindowStart(nowMs: number = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return nowSec - (nowSec % ROTATE_SECONDS)
}

/** Seconds remaining until the *next* rotation — drives the countdown ring in the UI. */
export function secondsUntilRotation(nowMs: number = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  const start = currentWindowStart(nowMs)
  return ROTATE_SECONDS - (nowSec - start)
}

// ---------------------------------------------------------------------------
// Sign / decode / verify
// ---------------------------------------------------------------------------

/** Signs a fresh token for `uid` for the current rotation window. This is what the member's app calls to render its QR. */
export async function signCheckInToken(uid: string, secret: string, nowMs: number = Date.now()): Promise<string> {
  const windowStart = currentWindowStart(nowMs)
  const claim: TokenClaim = { uid, iat: windowStart, exp: windowStart + ROTATE_SECONDS }
  const payloadB64 = bytesToBase64Url(utf8Encoder.encode(JSON.stringify(claim)))
  const sigBytes = await hmacSign(secret, payloadB64)
  return `${TOKEN_VERSION}.${payloadB64}.${bytesToBase64Url(sigBytes)}`
}

/**
 * Reads the claimed member id out of a token *without* verifying it —
 * enough to know whose secret to check the signature against, nothing
 * more. Never trust `.uid` from this alone; always follow with verify().
 */
export function decodeTokenUnsafe(token: string): TokenClaim | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null
    const claim = JSON.parse(utf8Decoder.decode(base64UrlToBytes(parts[1]))) as Partial<TokenClaim>
    if (typeof claim.uid !== 'string' || !claim.uid) return null
    if (typeof claim.iat !== 'number' || typeof claim.exp !== 'number') return null
    return claim as TokenClaim
  } catch {
    return null
  }
}

/** Full verification: format, real HMAC signature against the given secret, and the rotation window. This is what the scanner calls. */
export async function verifyCheckInToken(token: string, secret: string, nowMs: number = Date.now()): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { ok: false, reason: 'malformed' }

  const claim = decodeTokenUnsafe(token)
  if (!claim) return { ok: false, reason: 'malformed' }

  const expectedSig = bytesToBase64Url(await hmacSign(secret, parts[1]))
  if (!timingSafeEqual(expectedSig, parts[2])) return { ok: false, reason: 'bad_signature' }

  const nowSec = Math.floor(nowMs / 1000)
  if (nowSec < claim.iat - CLOCK_SKEW_SECONDS || nowSec > claim.exp + CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, claim }
}
