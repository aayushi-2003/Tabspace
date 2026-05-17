import { createClient } from "@supabase/supabase-js";

const hasChromeStorage = () =>
  typeof globalThis.chrome !== "undefined" &&
  Boolean(globalThis.chrome.storage?.local);

const authStorage = {
  async getItem(key) {
    if (hasChromeStorage()) {
      const result = await globalThis.chrome.storage.local.get([key]);

      return result[key] ?? null;
    }

    return localStorage.getItem(key);
  },

  async setItem(key, value) {
    if (hasChromeStorage()) {
      await globalThis.chrome.storage.local.set({
        [key]: value
      });

      return;
    }

    localStorage.setItem(key, value);
  },

  async removeItem(key) {
    if (hasChromeStorage()) {
      await globalThis.chrome.storage.local.remove([key]);

      return;
    }

    localStorage.removeItem(key);
  }
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: authStorage
    }
  }
);
