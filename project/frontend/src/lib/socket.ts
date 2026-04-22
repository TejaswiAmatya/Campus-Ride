import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Singleton Socket.io client. Uses Vite proxy in dev (`/socket.io` → backend).
 * Set `VITE_SOCKET_URL` if the socket server is not same-origin.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      autoConnect: false,
      withCredentials: true,
    })
  }
  return socket
}

export function useSocket() {
  const s = getSocket()
  const [isConnected, setIsConnected] = useState(s.connected)

  useEffect(() => {
    setIsConnected(s.connected)

    function onConnect() {
      setIsConnected(true)
    }
    function onDisconnect() {
      setIsConnected(false)
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    if (!s.connected) {
      s.connect()
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [s])

  return { socket: s, isConnected }
}
