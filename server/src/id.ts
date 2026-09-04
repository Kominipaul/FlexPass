import { randomBytes } from 'node:crypto'

/** Prefixed, readable ids — these show up in the UI and the door log. */
export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`
}
