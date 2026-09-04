import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { env } from './env.ts'
import { pool } from './db.ts'
import authRoutes from './routes/auth.ts'
import memberRoutes from './routes/member.ts'
import classRoutes from './routes/classes.ts'
import checkinRoutes from './routes/checkin.ts'
import adminRoutes from './routes/admin.ts'

const app = Fastify({
  logger: {
    // One short line per request. The default dumps the whole request and
    // response object for every call, which floods the terminal and costs
    // real time on a chatty client.
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,reqId,req,res,responseTime' },
    },
    level: process.env.LOG_LEVEL ?? 'warn',
  },
  disableRequestLogging: true,
})

await app.register(cookie)

app.get('/api/health', async () => {
  const r = await pool.query('SELECT now() AS now')
  return { ok: true, db: r.rows[0].now }
})

await app.register(authRoutes)
await app.register(memberRoutes)
await app.register(classRoutes)
await app.register(checkinRoutes)
await app.register(adminRoutes)

app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  app.log.error(err)
  // 4xx messages are ours and safe to show; 5xx detail stays in the log.
  const client = typeof err.statusCode === 'number' && err.statusCode < 500
  reply.code(client ? err.statusCode! : 500)
    .send({ error: client ? err.message : 'Something went wrong on our end.' })
})

// 0.0.0.0 so the Vite dev proxy — and anything else on the LAN — can reach it.
await app.listen({ port: env.port, host: '0.0.0.0' })
// Printed regardless of log level — you always want to see this one.
console.log(`FlexPass API ready on http://localhost:${env.port}`)
