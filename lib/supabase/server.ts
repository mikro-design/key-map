/**
 * Supabase Server Configuration
 *
 * Server-side Supabase instance for API routes and server components
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

/**
 * Supabase client for server-side operations
 * Uses service role key for elevated permissions
 * NEVER expose this client to the browser!
 */
export const supabaseServer = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseServer;
