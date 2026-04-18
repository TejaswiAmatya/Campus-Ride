import express from 'express'
import http from 'http'
import cors from 'cors'
import { initSocket } from './socket'
import { usersRouter } from './users/router'
import { ridesRouter } from './rides/router'
import { bookingsRouter } from './bookings/router'
import { adminRouter } from './admin/router'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const server = http.createServer(app)

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server)

// ── Global middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/users', usersRouter)
app.use('/api/rides', ridesRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/admin', adminRouter)

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler)

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8000', 10)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[backend] Server running on http://0.0.0.0:${PORT}`)
})

export { app, server }
