import { afterEach, vi } from 'vitest'

import { resetUnitBuilders } from './builders'
import { forbidImport, forbiddenBoundary } from './guards'

function forbiddenCall(name: string): (...args: unknown[]) => never {
  return () => {
    throw new Error(
      `[unit-test harness] ${name} is not allowed in *.unit.test.ts. Mock the boundary explicitly or move the scenario to *.integration.test.ts.`,
    )
  }
}

vi.mock('supertest', () => forbidImport('supertest'))
vi.mock('../lib/prisma', () => ({ prisma: forbiddenBoundary('Prisma client') }))
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: forbiddenBoundary('Supabase admin client'),
  supabaseAuth: forbiddenBoundary('Supabase auth client'),
  createAuthUser: forbiddenBoundary('createAuthUser'),
  registerAuthUser: forbiddenBoundary('registerAuthUser'),
  confirmAuthSignup: forbiddenBoundary('confirmAuthSignup'),
  deleteAuthUser: forbiddenBoundary('deleteAuthUser'),
  uploadLicense: forbiddenBoundary('uploadLicense'),
  uploadInsurance: forbiddenBoundary('uploadInsurance'),
  createSignedPrivateDocumentUrl: forbiddenBoundary('createSignedPrivateDocumentUrl'),
  uploadAcademicId: forbiddenBoundary('uploadAcademicId'),
  uploadAvatar: forbiddenBoundary('uploadAvatar'),
  deleteAvatar: forbiddenBoundary('deleteAvatar'),
  deletePrivateDocuments: forbiddenBoundary('deletePrivateDocuments'),
}))
vi.mock('../lib/emailQueue', () => ({ emailQueue: forbiddenBoundary('emailQueue') }))
vi.mock('../lib/notify', () => ({ notify: forbiddenBoundary('notify') }))
vi.mock('../config/redis', () => ({ default: forbiddenBoundary('Redis connection') }))

vi.mock('node:http', async () => {
  const actual = await vi.importActual<typeof import('node:http')>('node:http')

  return {
    ...actual,
    request: forbiddenCall('http.request'),
    get: forbiddenCall('http.get'),
  }
})

vi.mock('node:https', async () => {
  const actual = await vi.importActual<typeof import('node:https')>('node:https')

  return {
    ...actual,
    request: forbiddenCall('https.request'),
    get: forbiddenCall('https.get'),
  }
})

vi.mock('node:net', async () => {
  const actual = await vi.importActual<typeof import('node:net')>('node:net')

  return {
    ...actual,
    connect: forbiddenCall('net.connect'),
    createConnection: forbiddenCall('net.createConnection'),
  }
})

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')

  return {
    ...actual,
    readFileSync: forbiddenCall('fs.readFileSync'),
    writeFileSync: forbiddenCall('fs.writeFileSync'),
    createReadStream: forbiddenCall('fs.createReadStream'),
    createWriteStream: forbiddenCall('fs.createWriteStream'),
  }
})

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')

  return {
    ...actual,
    readFile: forbiddenCall('fs.promises.readFile'),
    writeFile: forbiddenCall('fs.promises.writeFile'),
    appendFile: forbiddenCall('fs.promises.appendFile'),
    mkdir: forbiddenCall('fs.promises.mkdir'),
    rm: forbiddenCall('fs.promises.rm'),
    unlink: forbiddenCall('fs.promises.unlink'),
  }
})

if (typeof globalThis.fetch === 'function') {
  vi.stubGlobal('fetch', forbiddenCall('fetch') as typeof fetch)
}

afterEach(() => {
  vi.clearAllMocks()
  resetUnitBuilders()
})
