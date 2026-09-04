import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Tiny .env reader — one file, no interpolation, no dependency.
const here = dirname(fileURLToPath(import.meta.url))
try {
  const raw = readFileSync(join(here, '..', '.env'), 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1).trim()
  }
} catch {
  // No .env — rely on the real environment.
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var ${name}. Copy server/.env.example to server/.env.`)
  return v
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
  checkInSigningKey: required('CHECKIN_SIGNING_KEY'),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
}
