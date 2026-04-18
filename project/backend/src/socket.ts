import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'

let io: Server

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // ── Auth middleware on every connection ─────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) {
      return next(new Error('Authentication required'))
    }
    const secret = process.env.SUPABASE_JWT_SECRET
    if (!secret) {
      return next(new Error('Server misconfiguration: JWT secret missing'))
    }
    try {
      const payload = jwt.verify(token, secret) as { sub: string; email: string; role?: string }
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; email: string }
    console.log(`[socket] Connected: ${socket.id} (user: ${user.email})`)

    // Automatically join a personal room for targeted notifications
    socket.join(`user:${user.sub}`)

    // ── Ride rooms ──────────────────────────────────────────────────────
    socket.on('join:ride', (rideId: string) => {
      socket.join(`ride:${rideId}`)
      console.log(`[socket] ${user.email} joined ride:${rideId}`)
    })

    socket.on('leave:ride', (rideId: string) => {
      socket.leave(`ride:${rideId}`)
    })

    // ── driver:location ─────────────────────────────────────────────────
    // Driver emits their GPS position; all clients in the ride room receive it.
    // TODO: validate that socket.data.user.sub matches ride.driverId before broadcasting
    socket.on('driver:location', (data: { rideId: string; lat: number; lng: number }) => {
      io.to(`ride:${data.rideId}`).emit('driver:location', {
        lat: data.lat,
        lng: data.lng,
        updatedAt: new Date().toISOString(),
      })
    })

    // ── chat:message ─────────────────────────────────────────────────────
    // TODO: persist messages to a ChatMessage model and validate room membership
    socket.on('chat:message', (data: { rideId: string; text: string }) => {
      io.to(`ride:${data.rideId}`).emit('chat:message', {
        userId: user.sub,
        text: data.text,
        sentAt: new Date().toISOString(),
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket] Disconnected: ${socket.id} (${reason})`)
    })
  })

  console.log('[socket] Socket.io initialised')
  return io
}

/**
 * Returns the Socket.io server instance.
 * Call this from controllers/services that need to emit events.
 */
export function getIO(): Server {
  if (!io) throw new Error('Socket.io has not been initialised — call initSocket first')
  return io
}

/**
 * Typed emit helpers so feature modules never import the raw `io`.
 * Track D (admin/notifications) populates these; Tracks B and C call them.
 */
export const notify = {
  /** Notify a driver that a new booking has been made on their ride */
  bookingNew(driverId: string, payload: { bookingId: string; rideId: string; passengerName: string }) {
    getIO().to(`user:${driverId}`).emit('booking:new', payload)
  },

  /** Notify a passenger that their booking status changed */
  bookingStatus(passengerId: string, payload: { bookingId: string; status: string }) {
    getIO().to(`user:${passengerId}`).emit('booking:status', payload)
  },

  /** Broadcast a ride status change (started / completed) to all ride participants */
  rideStatus(rideId: string, payload: { status: string; updatedAt: string }) {
    getIO().to(`ride:${rideId}`).emit('ride:status', payload)
  },
}
