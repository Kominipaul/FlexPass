// Mirrors internal/doorpass (Go) exactly: HMAC-SHA256(secret, window),
// truncated to 10 bytes, base32-encoded (16 chars), grouped as
// XXXX-XXXX-XXXX-XXXX. Computed entirely client-side from the secret
// fetched once at login — the pass keeps rotating with no network call.

export const WINDOW_SECONDS = 15

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function currentWindow(now: number = Date.now()): bigint {
  return BigInt(Math.floor(now / 1000 / WINDOW_SECONDS))
}

async function hmacSha256(keyBytes: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  // TS's DOM lib types BufferSource as backed by a plain ArrayBuffer, which
  // a generic Uint8Array<ArrayBufferLike> can't statically prove (it might
  // wrap a SharedArrayBuffer) — the cast is safe here since every caller in
  // this file constructs its arrays with `new Uint8Array(n)`.
  const key = await crypto.subtle.importKey(
    'raw', keyBytes as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, message as BufferSource)
  return new Uint8Array(sig)
}

function windowToBytes(window: bigint): Uint8Array {
  // Big-endian uint64, matching Go's binary.BigEndian.PutUint64.
  const buf = new Uint8Array(8)
  let w = window
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(w & 0xffn)
    w >>= 8n
  }
  return buf
}

/** Computes the display token for one rotation window. */
export async function token(secret: Uint8Array, window: bigint): Promise<string> {
  const mac = await hmacSha256(secret, windowToBytes(window))
  const raw = base32Encode(mac.slice(0, 10)) // 16 chars
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`
}

/** Joins a member code and its current token into the QR payload. */
export function encode(memberCode: string, tok: string): string {
  return `${memberCode}:${tok}`
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
