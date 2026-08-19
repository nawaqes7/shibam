import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

/**
 * A public Supabase client is intentionally safe to ship to the browser, but
 * the app must still render when deployment secrets are missing. The previous
 * implementation passed undefined values to createClient during module import,
 * which caused React to fail before it could render anything.
 */
export const isSupabaseConfigured = Boolean(configuredUrl && configuredKey);

const SUPABASE_URL = configuredUrl || "https://placeholder.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = configuredKey || "placeholder-anon-key";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
