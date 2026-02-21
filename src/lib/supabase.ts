import { createClient } from '@supabase/supabase-js';
import { createMockClient } from './mockSupabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('Supabase credentials missing or placeholder. Using mock client with localStorage.');
  client = createMockClient();
} else {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
