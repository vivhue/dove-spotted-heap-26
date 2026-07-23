import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase env is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
}

const webStorage: SupportedStorage = {
  getItem: async (key) => {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage.getItem(key);
  },
  removeItem: async (key) => {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return;
    }

    globalThis.localStorage.removeItem(key);
  },
  setItem: async (key, value) => {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return;
    }

    globalThis.localStorage.setItem(key, value);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    persistSession: true,
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
  },
});
