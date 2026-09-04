/**
 * Seeds reference data (clubs, plans, timetable, staff) plus a demo member
 * cast so a fresh database is immediately usable.
 *
 * Idempotent: reference rows upsert, and member rows are skipped if a user
 * with that email already exists. Safe to re-run.
 */
import { ACTIVITIES, LOCATIONS, PLANS, STAFF_SEED } from '../../src/lib/reference.ts'
import { applySchema, pool, query } from './db.ts'
import { hashPassword } from './auth.ts'
import { makeSecretSalt } from './domain/tokens.ts'
import { makeId } from './id.ts'

const DEMO_PASSWORD = 'flexpass123'
const MEMBER_PASSWORD = 'member123'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000)
const pin = () => String(1000 + Math.floor(Math.random() * 9000))

interface MemberSpec {
  id: string; name: string; email: string; planId: string; locationIdx: number
  status: string; daysLeft: number; memberSinceDays: number; visits: number
  avatarColor: string; pin: string
}

const ROSTER: MemberSpec[] = [
  { id: 'u_demo', name: 'Alex Morgan', email: 'demo@flexpass.app', planId: 'plan_standard', locationIdx: 0, status: 'active', daysLeft: 9, memberSinceDays: 430, visits: 14, avatarColor: 'volt', pin: '4821' },
  { id: 'u_1042', name: 'Jordan Ellis', email: 'jordan.ellis@example.com', planId: 'plan_standard', locationIdx: 0, status: 'active', daysLeft: 22, memberSinceDays: 380, visits: 6, avatarColor: 's1', pin: pin() },
  { id: 'u_1108', name: 'Priya Nair', email: 'priya.nair@example.com', planId: 'plan_elite', locationIdx: 1, status: 'active', daysLeft: 15, memberSinceDays: 210, visits: 9, avatarColor: 'ember', pin: pin() },
  { id: 'u_1233', name: 'Marcus Webb', email: 'marcus.webb@example.com', planId: 'plan_basic', locationIdx: 0, status: 'active', daysLeft: 3, memberSinceDays: 40, visits: 3, avatarColor: 's2', pin: pin() },
  { id: 'u_1290', name: 'Devon Cruz', email: 'devon.cruz@example.com', planId: 'plan_standard', locationIdx: 1, status: 'frozen', daysLeft: 60, memberSinceDays: 300, visits: 2, avatarColor: 'froze', pin: pin() },
  { id: 'u_1355', name: 'Harper Wu', email: 'harper.wu@example.com', planId: 'plan_elite', locationIdx: 0, status: 'active', daysLeft: 210, memberSinceDays: 640, visits: 12, avatarColor: 's3', pin: pin() },
  { id: 'u_1401', name: 'Elena Vasquez', email: 'elena.vasquez@example.com', planId: 'plan_basic', locationIdx: 0, status: 'active', daysLeft: -6, memberSinceDays: 500, visits: 1, avatarColor: 'bad', pin: pin() },
  { id: 'u_1477', name: 'Miles Okafor', email: 'miles.okafor@example.com', planId: 'plan_standard', locationIdx: 0, status: 'active', daysLeft: 45, memberSinceDays: 150, visits: 5, avatarColor: 's5', pin: pin() },
  { id: 'u_1512', name: 'Ruby Chen', email: 'ruby.chen@example.com', planId: 'plan_elite', locationIdx: 1, status: 'active', daysLeft: 5, memberSinceDays: 90, visits: 8, avatarColor: 's4', pin: pin() },
  { id: 'u_1566', name: 'Tobias Grant', email: 'tobias.grant@example.com', planId: 'plan_basic', locationIdx: 1, status: 'active', daysLeft: 60, memberSinceDays: 60, visits: 4, avatarColor: 'good', pin: pin() },
  { id: 'u_1604', name: 'Naomi Torres', email: 'naomi.torres@example.com', planId: 'plan_standard', locationIdx: 0, status: 'pending_cancellation', daysLeft: 12, memberSinceDays: 260, visits: 3, avatarColor: 'warn', pin: pin() },
  { id: 'u_1688', name: 'Sasha Kim', email: 'sasha.kim@example.com', planId: 'plan_elite', locationIdx: 0, status: 'cancelled', daysLeft: -20, memberSinceDays: 700, visits: 0, avatarColor: 'slate', pin: pin() },
]

async function main() {
  await applySchema()

  for (const l of LOCATIONS) {
    await query(
      `INSERT INTO locations (id,name,address,hours,closed_days,closed_dates) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, address=EXCLUDED.address, hours=EXCLUDED.hours,
         closed_days=EXCLUDED.closed_days, closed_dates=EXCLUDED.closed_dates`,
      [l.id, l.name, l.address, l.hours, l.closedDays, l.closedDates],
    )
  }

  for (const [i, p] of PLANS.entries()) {
    await query(
      `INSERT INTO plans (id,tier,name,tagline,price_monthly,price_yearly,color,popular,class_credits,guest_passes,all_locations,perks,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET tier=EXCLUDED.tier, name=EXCLUDED.name, tagline=EXCLUDED.tagline,
         price_monthly=EXCLUDED.price_monthly, price_yearly=EXCLUDED.price_yearly, color=EXCLUDED.color,
         popular=EXCLUDED.popular, class_credits=EXCLUDED.class_credits, guest_passes=EXCLUDED.guest_passes,
         all_locations=EXCLUDED.all_locations, perks=EXCLUDED.perks, sort_order=EXCLUDED.sort_order`,
      [p.id, p.tier, p.name, p.tagline, p.priceMonthly, p.priceYearly, p.color, p.popular ?? false,
       p.classCredits === 'unlimited' ? null : p.classCredits, p.guestPasses, p.allLocations, p.perks, i],
    )
  }

  for (const a of ACTIVITIES) {
    await query(
      `INSERT INTO activities (id,kind,name,category,instructor,location,location_id,level,description,capacity,color,schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind, name=EXCLUDED.name, category=EXCLUDED.category,
         instructor=EXCLUDED.instructor, location=EXCLUDED.location, location_id=EXCLUDED.location_id,
         level=EXCLUDED.level, description=EXCLUDED.description, capacity=EXCLUDED.capacity,
         color=EXCLUDED.color, schedule=EXCLUDED.schedule`,
      [a.id, a.kind, a.name, a.category, a.instructor, a.location, a.locationId, a.level,
       a.description, a.capacity, a.color, JSON.stringify(a.schedule)],
    )
  }

  const staffHash = await hashPassword(DEMO_PASSWORD)
  for (const s of STAFF_SEED) {
    await query(
      `INSERT INTO staff (id,name,email,password_hash,role,avatar_color) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar_color=EXCLUDED.avatar_color`,
      [s.id, s.name, s.email, staffHash, s.role, s.avatarColor],
    )
  }

  const demoHash = await hashPassword(DEMO_PASSWORD)
  const memberHash = await hashPassword(MEMBER_PASSWORD)

  for (const spec of ROSTER) {
    const existing = await query('SELECT id FROM users WHERE id = $1', [spec.id])
    if (existing.length) {
      console.log(`  skip ${spec.name} (already exists)`)
      continue
    }
    const isDemo = spec.id === 'u_demo'
    await query(
      `INSERT INTO users (id,name,email,phone,dob,address,member_since,avatar_color,password_hash,
         emergency_contact,two_factor_enabled,check_in_pin,check_in_secret,last_password_change)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        spec.id, spec.name, spec.email,
        isDemo ? '(555) 214-7788' : '(555) 010-' + spec.id.slice(-4),
        isDemo ? '1994-06-12' : '',
        isDemo ? '482 Maple Grove Ave, Austin, TX' : '',
        daysAgo(spec.memberSinceDays), spec.avatarColor,
        isDemo ? demoHash : memberHash,
        JSON.stringify(isDemo ? { name: 'Sam Morgan', phone: '(555) 981-2244', relationship: 'Sibling' } : { name: '', phone: '', relationship: '' }),
        false, spec.pin, makeSecretSalt(), daysAgo(spec.memberSinceDays),
      ],
    )

    await query(
      `INSERT INTO memberships (id,user_id,plan_id,status,billing_cycle,auto_renew,start_date,renewal_date,home_location,freeze_history)
       VALUES ($1,$2,$3,$4,'monthly',$5,$6,$7,$8,'[]'::jsonb)`,
      ['mem_' + spec.id, spec.id, spec.planId, spec.status, spec.status === 'active',
       daysAgo(spec.memberSinceDays), daysFromNow(spec.daysLeft), LOCATIONS[spec.locationIdx].name],
    )

    // A plausible visit history, so streaks and the door log aren't empty.
    const locName = LOCATIONS[spec.locationIdx].name
    for (let v = 0; v < spec.visits; v++) {
      const when = daysAgo(Math.floor(v * 2.3) + 1)
      when.setHours(6 + (v % 12), (v * 17) % 60, 0, 0)
      await query(
        'INSERT INTO check_ins (id,user_id,timestamp,location,method,duration_mins) VALUES ($1,$2,$3,$4,$5,$6)',
        [makeId('chk'), spec.id, when, locName, 'QR', 45 + ((v * 7) % 40)],
      )
    }

    await query(
      `INSERT INTO notifications (id,user_id,type,title,message,created_at,read) VALUES ($1,$2,'general',$3,$4,$5,false)`,
      [makeId('ntf'), spec.id, `Welcome to FlexPass, ${spec.name.split(' ')[0]}!`,
       'Your membership is active. Show the QR on your Check In page at the door.', daysAgo(spec.memberSinceDays)],
    )
  }

  // A payment method + invoice history for the demo member only.
  const demoHasCard = await query('SELECT id FROM payment_methods WHERE user_id = $1', ['u_demo'])
  if (!demoHasCard.length) {
    await query(
      `INSERT INTO payment_methods (id,user_id,brand,last4,exp_month,exp_year,is_default,name_on_card)
       VALUES ($1,'u_demo','Visa','4242',11,2027,true,'Alex Morgan')`,
      [makeId('pm')],
    )
    for (let m = 0; m < 6; m++) {
      await query(
        `INSERT INTO invoices (id,user_id,date,description,amount,status,method)
         VALUES ($1,'u_demo',$2,$3,59,'paid','Visa ending 4242')`,
        [makeId('inv'), daysAgo(m * 30 + 2), 'Standard plan — monthly membership'],
      )
    }
  }

  console.log('\nSeed complete.')
  console.log(`  Member: demo@flexpass.app / ${DEMO_PASSWORD}`)
  console.log(`  Other members: <email> / ${MEMBER_PASSWORD}`)
  console.log(`  Staff:  staff@flexpass.app / ${DEMO_PASSWORD}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
