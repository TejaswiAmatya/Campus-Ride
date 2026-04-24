import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/error'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY and/or SUPABASE_SERVICE_ROLE_KEY',
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
 * Supabase auth client — uses anon key for user sign-in flows.
 * Keep this separate from service-role client so user sessions never leak into admin/storage operations.
 */
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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

export async function uploadAvatar(
  userId: string,
  buffer: Buffer,
  filetype: string
): Promise<string> {
  const ext = filetype.split('/')[1] ?? 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  const { error } = await supabaseAdmin.storage.from('avatars').upload(path, buffer, {
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

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
