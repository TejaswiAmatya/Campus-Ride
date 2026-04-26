import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/error'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const missingSupabaseConfigMessage =
  'Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY and/or SUPABASE_SERVICE_ROLE_KEY'

type SupabaseClientInstance = ReturnType<typeof createClient>

let supabaseAdminInstance: SupabaseClientInstance | null = null
let supabaseAuthInstance: SupabaseClientInstance | null = null

function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error(missingSupabaseConfigMessage)
  }
}

function getSupabaseAdminClient() {
  assertSupabaseConfig()
  const url = supabaseUrl!
  const serviceRoleKey = supabaseServiceRoleKey!

  supabaseAdminInstance ??= createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return supabaseAdminInstance
}

function getSupabaseAuthClient() {
  assertSupabaseConfig()
  const url = supabaseUrl!
  const anonKey = supabaseAnonKey!

  supabaseAuthInstance ??= createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return supabaseAuthInstance
}

function createLazyClient(getClient: () => SupabaseClientInstance) {
  return new Proxy({} as SupabaseClientInstance, {
    get(_target, prop) {
      const client = getClient()
      const value = Reflect.get(client, prop)
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}

/**
 * Supabase admin client — uses the service-role key for elevated access.
 */
export const supabaseAdmin = createLazyClient(getSupabaseAdminClient)

/**
 * Supabase auth client — uses the anon key for user-facing auth flows.
 */
export const supabaseAuth = createLazyClient(getSupabaseAuthClient)

export async function createAuthUser(email: string, password: string) {
  return getSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
}

export async function deleteAuthUser(userId: string) {
  return getSupabaseAdminClient().auth.admin.deleteUser(userId)
}

export async function uploadLicense(
  userId: string,
  buffer: Buffer,
  filetype: string
) : Promise<string> {
  // Get the extension from the mimetype
  const ext = filetype.split('/')[1]
  const path = `${userId}/license.${ext}`

  // Upload the file to Supabase Storage
  const { error } = await getSupabaseAdminClient().storage.from('DriversInfo').upload(path, buffer, {
    contentType: filetype,
    upsert: true,
  })

  if (error) {
    console.error('Supabase license upload failed:', {
      message: error.message,
      name: error.name,
      userId,
      path,
      filetype,
    })
    throw new AppError('UPLOAD_FAILED', 'Failed to upload license', 500)
  }
  return path
}

export async function createSignedLicenseUrl(path: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('DriversInfo')
    .createSignedUrl(path, 60 * 60)

  if (error || !data?.signedUrl) {
    console.error('Supabase signed license URL creation failed:', {
      message: error?.message,
      name: error?.name,
      path,
    })
    throw new AppError('UPLOAD_FAILED', 'Failed to access license', 500)
  }

  return data.signedUrl
}

export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  filetype: string
): Promise<string> {
  const ext = filetype.split('/')[1] ?? 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  const { error } = await getSupabaseAdminClient().storage.from('avatars').upload(path, buffer, {
    contentType: filetype,
    upsert: false,
  })

  if (error) {
    console.error('Supabase avatar upload failed:', {
      message: error.message,
      name: error.name,
      userId,
      path,
      filetype,
    })
    throw new AppError('UPLOAD_FAILED', 'Failed to upload avatar', 500)
  }

  const { data } = getSupabaseAdminClient().storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
