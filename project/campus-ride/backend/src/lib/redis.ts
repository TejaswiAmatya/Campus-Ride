import { Redis } from 'ioredis'

let redisClient: Redis

/**
 * Returns the shared Redis connection.
 * BullMQ requires maxRetriesPerRequest: null on the connection it uses.
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    })

    redisClient.on('connect', () => console.log('[redis] connected'))
    redisClient.on('error', (err) => console.error('[redis] error:', err.message))
  }
  return redisClient
}
