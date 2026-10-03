import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';


// ════════════════════════════════════════════════════════════════════════════
// config.ts
// ════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const BUCKET = process.env.EXPO_PUBLIC_STORAGE_BUCKET || 'skfl-media';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase Config] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please check your .env.local file or EAS environment variables.'
  );
}

// Master login: everyone signs in with the one shared company email + password. The password is
// never stored in the app — Supabase Auth checks it (see supabase/SETUP.md).

export const Config = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORAGE_BUCKET: BUCKET,
};

// ════════════════════════════════════════════════════════════════════════════
// supabase.ts
// ════════════════════════════════════════════════════════════════════════════

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY, {
  auth: {
    // The master-login session is kept on the device so people sign in once, not on every launch
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const STORAGE_BUCKET = Config.STORAGE_BUCKET;
