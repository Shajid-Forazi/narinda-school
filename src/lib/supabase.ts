import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Ensure we don't crash if the URL is invalid
let supabaseInstance;
try {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });
} catch (e) {
  console.error("Failed to initialize Supabase client:", e);
  // Fallback to a dummy object to prevent crashes on property access
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ error: new Error("Supabase not configured") }),
      resetPasswordForEmail: async () => ({ error: new Error("Supabase not configured") }),
      updateUser: async () => ({ error: new Error("Supabase not configured") }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({
            range: async () => ({ data: [], error: null, count: 0 }),
          }),
        }),
        order: () => ({
          range: async () => ({ data: [], error: null, count: 0 }),
        }),
      }),
      insert: async () => ({ error: new Error("Supabase not configured") }),
      update: () => ({ eq: async () => ({ error: new Error("Supabase not configured") }) }),
      upsert: async () => ({ error: new Error("Supabase not configured") }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: new Error("Supabase not configured") }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as any;
}

export const supabase = supabaseInstance;
