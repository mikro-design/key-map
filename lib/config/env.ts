import { z } from 'zod';

/**
 * Client-side environment variables (prefixed with NEXT_PUBLIC_)
 * These are safe to expose to the browser
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'Invalid Supabase anon key'),
  NEXT_PUBLIC_MAPTILER_KEY: z.string().optional(),
});

/**
 * Server-side environment variables
 * These should NEVER be exposed to the browser
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'Invalid Supabase service role key'),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

/**
 * Validate environment variables at startup
 * Fails fast with clear error messages if anything is missing or invalid
 */
function validateEnv() {
  try {
    // Always validate client env
    const clientEnv = clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
    });

    // Only validate server env on server-side
    if (typeof window === 'undefined') {
      const serverEnv = serverEnvSchema.parse({
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      });

      return { ...clientEnv, ...serverEnv };
    }

    return clientEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const missing = zodError.issues.map(e => {
        const field = e.path.join('.');
        return `  - ${field}: ${e.message}`;
      }).join('\n');

      throw new Error(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `❌ Missing or invalid environment variables:\n\n${missing}\n\n` +
        `Please check your .env.local file.\n` +
        `See .env.example for required variables.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * This will throw at startup if any required vars are missing
 */
export const env = validateEnv();

/**
 * Type-safe environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = ClientEnv & Partial<ServerEnv>;
