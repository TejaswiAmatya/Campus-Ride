import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'

const runLiveIntegrationTests = ['1', 'true'].includes(
  (process.env.RUN_LIVE_INTEGRATION_TESTS ?? '').toLowerCase(),
)
const describeLiveIntegration = runLiveIntegrationTests ? describe.sequential : describe.skip

type ApiError = {
  code: string
  message: string
}

type RegisterResponse = {
  data: {
    id: string
    email: string
    name: string
  } | null
  error: ApiError | null
}

type LoginResponse = {
  data: {
    access_token: string
    refresh_token: string
  } | null
  error: ApiError | null
}

type MeResponse = {
  id: string
  email: string
  name: string
  role: string
  accountStatus: 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED'
  suspendedUntil: string | null
  avatarPath: string | null
  driverStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  createdAt: string
}

describeLiveIntegration('Users/Auth integration', () => {
  const createdUserIds: string[] = []

  beforeEach(() => {
    createdUserIds.length = 0
  })

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'university.edu' } } })

    for (const userId of createdUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    }
  })

  it('register -> login -> GET /me full happy path flow', async () => {
    const email = `test-${Date.now()}@university.edu`
    const password = 'password123'

    const registerRes = await request(app).post('/api/auth/register').send({
      email,
      name: 'Test User',
      password,
    })

    expect(registerRes.status).toBe(201)
    const registerBody = registerRes.body as RegisterResponse
    expect(registerBody.data).toBeTruthy()
    expect(registerBody.data?.email).toBe(email)
    expect(registerBody.error ?? null).toBeNull()

    if (!registerBody.data?.id) {
      throw new Error('Expected register response to include data.id')
    }
    createdUserIds.push(registerBody.data.id)

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password,
    })

    expect(loginRes.status).toBe(200)
    const loginBody = loginRes.body as LoginResponse
    expect(loginBody.data?.access_token).toBeTruthy()
    expect(loginBody.error ?? null).toBeNull()

    const accessToken = loginBody.data?.access_token
    if (!accessToken) {
      throw new Error('Expected login response to include data.access_token')
    }

    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(meRes.status).toBe(200)
    const meBody = meRes.body as MeResponse
    expect(meBody.email).toBe(email)
    expect(meBody.accountStatus).toBe('ACTIVE')
    expect(meBody.suspendedUntil).toBeNull()
    expect(meBody.driverStatus).toBeNull()
  })

  it('returns 409 when registering the same email twice', async () => {
    const email = `dupe-${Date.now()}@university.edu`
    const payload = {
      email,
      name: 'Duplicate Test',
      password: 'password123',
    }

    const firstRes = await request(app).post('/api/auth/register').send(payload)
    expect(firstRes.status).toBe(201)
    const firstBody = firstRes.body as RegisterResponse
    if (!firstBody.data?.id) {
      throw new Error('Expected first register response to include data.id')
    }
    createdUserIds.push(firstBody.data.id)

    const secondRes = await request(app).post('/api/auth/register').send(payload)

    expect(secondRes.status).toBe(409)
    expect(secondRes.body.data ?? null).toBeNull()
    expect(secondRes.body.error?.code).toBe('CONFLICT')
    expect(secondRes.body.error?.message).toBeTruthy()
  })

  it('returns 422 for non-.edu email registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@gmail.com',
      name: 'Gmail User',
      password: 'password123',
    })

    expect(res.status).toBe(422)
    expect(res.body.data ?? null).toBeNull()
    expect(res.body.error?.message).toBeTruthy()
    expect(res.body.error?.code).toBe('VALIDATION_ERROR')
  })
})
