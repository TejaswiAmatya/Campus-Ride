import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SupabaseSessionTokens {
  access_token: string;
  refresh_token: string;
}

function parseJwtRef(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalized)) as { ref?: string };
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

const keyRef = parseJwtRef(supabaseAnonKey);
const urlRef = parseUrlRef(supabaseUrl);

if (keyRef && urlRef && keyRef !== urlRef) {
  console.warn(
    `[supabase] Key ref mismatch: anon key ref (${keyRef}) does not match URL ref (${urlRef}).`,
  );
}

export async function applySupabaseSession(tokens: SupabaseSessionTokens) {
  const { error } = await supabase.auth.setSession(tokens);
  if (error) {
    throw error;
  }
}

export async function clearSupabaseSession() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw error;
  }
}
