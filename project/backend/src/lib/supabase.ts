import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/error'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY and/or SUPABASE_SERVICE_ROLE_KEY',
  )
}

/**
 * Supabase admin client — uses the service-role key for elevated access.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Supabase auth client — uses the anon key for user-facing auth flows.
 */
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function createAuthUser(email: string, password: string) {
  return supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
}

export async function deleteAuthUser(userId: string) {
  return supabaseAdmin.auth.admin.deleteUser(userId)
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
  const { error } = await supabaseAdmin.storage.from('DriversInfo').upload(path, buffer, {
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
