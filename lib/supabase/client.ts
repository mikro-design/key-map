/**
 * Supabase Client Configuration
 *
 * Client-side Supabase instance for browser usage
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

/**
 * Supabase client for client-side operations
 * Uses validated environment variables that fail fast if missing
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucket: string,
  folder?: string
): Promise<{ files: any[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    return { files: data, error };
  } catch (error) {
    return { files: null, error: error as Error };
  }
}

export default supabase;
