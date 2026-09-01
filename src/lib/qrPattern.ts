/**
 * Deterministic, seeded pseudo-QR mosaic — purely decorative (this is a
 * demo, there's no real scanner backend), but stable per-user so the same
 * member always sees the same "code".
 */
function seedFromString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function stampFinder(grid: boolean[][], row: number, col: number) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      grid[row + i][col + j] = !(i === 1 && j === 1)
    }
  }
}

export function generateQrPattern(seed: string, size = 12): boolean[][] {
  const rand = mulberry32(seedFromString(seed))
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => rand() > 0.58),
  )
  stampFinder(grid, 0, 0)
  stampFinder(grid, 0, size - 3)
  stampFinder(grid, size - 3, 0)
  return grid
}
