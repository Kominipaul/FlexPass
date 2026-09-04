/** Applies schema.sql. `--drop` wipes every table first. */
import { applySchema, pool } from './db.ts'

const TABLES = [
  'password_resets', 'sessions', 'training_goals', 'pin_unlocks', 'door_scans',
  'staff', 'notifications', 'payment_methods', 'invoices', 'check_ins',
  'group_memberships', 'class_bookings', 'activities', 'memberships',
  'plans', 'locations', 'users',
]

async function main() {
  if (process.argv.includes('--drop')) {
    await pool.query(`DROP TABLE IF EXISTS ${TABLES.join(', ')} CASCADE`)
    console.log('dropped all tables')
  }
  await applySchema()
  console.log('schema applied')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
