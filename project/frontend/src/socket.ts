import { io, Socket } from 'socket.io-client'

let socket: Socket

/**
 * Returns the singleton Socket.io client instance.
 * Does NOT connect automatically — call connectSocket() to open the connection.
 */
export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('access_token')
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8000', {
      auth: { token: token ?? '' },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message)
    })
  }
  return socket
}

/** Connect (or reconnect) the socket after the user logs in. */
export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    // Update the auth token in case it changed (e.g. after login)
    const token = localStorage.getItem('access_token')
    s.auth = { token: token ?? '' }
    s.connect()
  }
}

/** Disconnect the socket when the user logs out. */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}
