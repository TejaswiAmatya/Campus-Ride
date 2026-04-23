import { defineConfig, env } from '@prisma/config'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})