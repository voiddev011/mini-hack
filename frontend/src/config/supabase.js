import { createClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const missingVariables = [
  !supabaseUrl && "VITE_SUPABASE_URL",
  !supabasePublishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter(Boolean);

export let supabaseConfigurationError = missingVariables.length
  ? `Missing required Supabase environment variables: ${missingVariables.join(", ")}. Set them in the project-root .env.local file and restart the Vite dev server.`
  : "";

if (!supabaseConfigurationError) {
  try {
    const url = new URL(supabaseUrl);
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error(
        "The Supabase URL must use HTTPS (or HTTP for local development).",
      );
    }
  } catch (error) {
    supabaseConfigurationError = error.message.startsWith("The Supabase URL")
      ? error.message
      : "VITE_SUPABASE_URL must be a valid Supabase project URL.";
  }
}

export const isSupabaseConfigured = !supabaseConfigurationError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      global: { fetch: fetchWithTimeout },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigurationError);
  }

  return supabase;
}
