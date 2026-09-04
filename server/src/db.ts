import pg from 'pg'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { env } from './env.ts'

// NUMERIC comes back as a string by default so precision isn't silently lost.
// Money here is small and never fractional beyond cents, so a number is safe
// and keeps the wire shape identical to the frontend's `amount: number`.
pg.types.setTypeParser(1700, (v) => Number(v))

export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 })

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await query<T>(text, params)
  return rows[0]
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function applySchema(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url))
  await pool.query(readFileSync(join(here, 'schema.sql'), 'utf8'))
}

/** ISO strings on the wire — the frontend types every date as a string. */
export function iso(value: Date | string | null | undefined): string {
  if (!value) return ''
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
