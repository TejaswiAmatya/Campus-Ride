import { createClient } from '@supabase/supabase-js'
import { AppError } from '../middleware/error'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY',
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

export async function uploadLicense(
  userId: string,
  buffer: Buffer,
  filetype: string
) : Promise<string> {
  // Get the extension from the mimetype
  const ext = filetype.split('/')[1]
  const path = `${userId}/license.${ext}`

  // Upload the file to Supabase Storage
  const {error} = await supabaseAdmin.storage.from('license').upload(path, buffer, {
    contentType: filetype,
    upsert: true,
  })

  if (error){
    throw new AppError('UPLOAD_FAILED', 'Failed to upload license', 500)
  }

  // Return the path to the file
  return path
}
