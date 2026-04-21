// frontend/src/lib/socket.ts
import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'

// Singleton instance
let socket: Socket | null = null

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      autoConnect: false,
      withCredentials: true
    })
  }
  return socket
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const s = getSocket()

  useEffect(() => {
    function onConnect() { setIsConnected(true) }
    function onDisconnect() { setIsConnected(false) }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    if (!s.connected) s.connect()

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [s])

  return { socket: s, isConnected }
}