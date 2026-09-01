/**
 * Deterministic, seeded pseudo-QR generator — purely decorative (this is a
 * demo, there's no real scanner backend), but stable per-token so the same
 * code always renders the same pattern, and canvas-drawn so it reads as a
 * real, scannable-looking code rather than a flat mosaic.
 */
function seedFromString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  let state = seed || 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rngFromSeed(seed: string) {
  return mulberry32(seedFromString(seed))
}

/** Generates a fresh random access-token, e.g. "FP-3K9Q-XR2M". */
export function makeAccessToken(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return ['FP', block(), block()].join('-')
}
