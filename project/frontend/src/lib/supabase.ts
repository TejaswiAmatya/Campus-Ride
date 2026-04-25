import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. Supabase session sync is disabled.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

interface SupabaseSessionTokens {
  access_token: string;
  refresh_token: string;
}

function parseJwtRef(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(normalized + padding)) as { ref?: string };
    return parsed.ref ?? null;
  } catch {
    return null;
  }
}

function parseUrlRef(url: string): string | null {
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

const keyRef = supabaseAnonKey ? parseJwtRef(supabaseAnonKey) : null;
const urlRef = supabaseUrl ? parseUrlRef(supabaseUrl) : null;

if (keyRef && urlRef && keyRef !== urlRef) {
  console.warn(
    `[supabase] Key ref mismatch: anon key ref (${keyRef}) does not match URL ref (${urlRef}).`,
  );
}

export async function applySupabaseSession(tokens: SupabaseSessionTokens) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.setSession(tokens);
  if (error) {
    throw error;
  }
}

export async function clearSupabaseSession() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw error;
  }
}
