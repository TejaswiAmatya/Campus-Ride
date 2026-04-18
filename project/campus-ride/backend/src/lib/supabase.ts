import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY',
  )
}

/**
 * Supabase admin client — uses the service-role key for elevated access.
 *
 * Use this server-side only:
 *  - Creating / deleting auth users
 *  - Uploading to Storage on behalf of users
 *  - Bypassing Row-Level Security when necessary
 *
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
