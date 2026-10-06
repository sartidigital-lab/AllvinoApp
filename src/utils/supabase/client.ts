import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/** Public, stateless browser client. Authentication is handled exclusively by
 * same-origin BFF routes, so this client never persists a user session. */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  )
}
