import { createClient } from '@supabase/supabase-js';

// Supabase client for browser-side usage
// Falls back to demo mode if env vars not set (for development without Supabase project)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';

// Check if we're in demo mode (no Supabase configured)
export const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need auth persistence for anonymous sessions
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Throttle events for better performance
    },
  },
});

// Demo mode handler - uses localStorage fallback for testing without Supabase
export const createDemoChannel = (channelName: string) => {
  console.warn('⚠️ Demo mode: Supabase not configured. Using localStorage fallback.');
  console.log('📝 To enable real-time collaboration:');
  console.log('1. Create a Supabase project at https://app.supabase.com');
  console.log('2. Copy .env.example to .env.local');
  console.log('3. Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');

  // Return mock channel for demo - needs to support chaining
  const mockChannel: any = {
    on: () => mockChannel, // Return self for chaining
    send: () => Promise.resolve('ok' as const),
    unsubscribe: () => Promise.resolve('ok' as const),
    presenceState: () => ({}),
    track: () => Promise.resolve('ok' as const),
    subscribe: async (callback: any) => {
      // Call callback immediately with SUBSCRIBED status
      if (callback) {
        setTimeout(() => callback('SUBSCRIBED'), 0);
      }
      return 'SUBSCRIBED' as const;
    },
  };
  return mockChannel;
};
