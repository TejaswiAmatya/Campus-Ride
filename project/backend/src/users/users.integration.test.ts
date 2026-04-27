import request from 'supertest'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { supabaseAdmin } from '../lib/supabase'
import { describeAuthIntegration } from '../test/integration/gates'

type ApiError = {
  code: string
  message: string
}

type RegisterResponse = {
  data: {
    email: string
    requiresEmailConfirmation: boolean
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
  phone: string | null
  role: string
  accountStatus: 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED'
  suspendedUntil: string | null
  avatarPath: string | null
  bio: string | null
  homeAddress: string | null
  homeLat: number | null
  homeLng: number | null
  campusAddress: string | null
  campusLat: number | null
  campusLng: number | null
  academicRole: 'STUDENT' | 'STAFF' | null
  academicVerificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  academicIdPath: string | null
  academicVerifiedAt: string | null
  academicRejectionReason: string | null
  driverStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  createdAt: string
}

describeAuthIntegration('Users/Auth integration (requires full Supabase auth stack)', () => {
  const createdUserIds: string[] = []
  const createdEmails: string[] = []

  beforeEach(() => {
    createdUserIds.length = 0
    createdEmails.length = 0
  })

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'university.edu' } } })

    for (const email of createdEmails) {
      const authUserIds = await listAuthUserIdsByEmail(email)
      createdUserIds.push(...authUserIds)
    }

    for (const userId of createdUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    }
  })

  it('register -> login -> GET /me full happy path flow', async () => {
    const email = `test-${Date.now()}@university.edu`
    const password = 'password123'
    createdEmails.push(email)

    const registerRes = await request(app).post('/api/auth/register').send({
      email,
      name: 'Test User',
      password,
    })

    expect(registerRes.status).toBe(202)
    const registerBody = registerRes.body as RegisterResponse
    expect(registerBody.data).toBeTruthy()
    expect(registerBody.data?.email).toBe(email)
    expect(registerBody.data?.requiresEmailConfirmation).toBe(true)
    expect(registerBody.error ?? null).toBeNull()

    const preConfirmLoginRes = await request(app).post('/api/auth/login').send({
      email,
      password,
    })

    expect(preConfirmLoginRes.status).toBe(403)
    expect(preConfirmLoginRes.body.error?.code).toBe('EMAIL_NOT_CONFIRMED')

    const authUserIds = await listAuthUserIdsByEmail(email)
    const authUserId = authUserIds[0]
    if (!authUserId) {
      throw new Error('Expected to find the Supabase auth user for this signup')
    }
    createdUserIds.push(authUserId)

    const confirmRes = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      email_confirm: true,
    })
    expect(confirmRes.error).toBeNull()

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
    expect(meBody.phone).toBeNull()
    expect(meBody.bio).toBeNull()
    expect(meBody.homeAddress).toBeNull()
    expect(meBody.homeLat).toBeNull()
    expect(meBody.homeLng).toBeNull()
    expect(meBody.campusAddress).toBeNull()
    expect(meBody.campusLat).toBeNull()
    expect(meBody.campusLng).toBeNull()
    expect(meBody.academicRole).toBeNull()
    expect(meBody.academicVerificationStatus).toBe('NOT_SUBMITTED')
    expect(meBody.academicIdPath).toBeNull()
    expect(meBody.academicVerifiedAt).toBeNull()
    expect(meBody.academicRejectionReason).toBeNull()
    expect(meBody.driverStatus).toBeNull()
  })

  it('returns 409 when registering the same email twice', async () => {
    const email = `dupe-${Date.now()}@university.edu`
    createdEmails.push(email)
    const payload = {
      email,
      name: 'Duplicate Test',
      password: 'password123',
    }

    const firstRes = await request(app).post('/api/auth/register').send(payload)
    expect(firstRes.status).toBe(202)
    const firstBody = firstRes.body as RegisterResponse
    expect(firstBody.data?.requiresEmailConfirmation).toBe(true)

    const secondRes = await request(app).post('/api/auth/register').send(payload)

    expect(secondRes.status).toBe(202)
    expect(secondRes.body.data?.email).toBe(email)
    expect(secondRes.body.data?.requiresEmailConfirmation).toBe(true)
    expect(secondRes.body.error ?? null).toBeNull()
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

async function listAuthUserIdsByEmail(email: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    throw error
  }

  return (data.users ?? [])
    .filter((user) => user.email?.toLowerCase() === email.toLowerCase())
    .map((user) => user.id)
}
