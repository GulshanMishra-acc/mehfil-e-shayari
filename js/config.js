// =====================================================================
// js/config.js  -  PUBLIC settings only
//
// >>> THIS IS THE ONLY FILE YOU NEED TO EDIT FOR SUPABASE <<<
//
// Where to find these two values:
//   Supabase Dashboard -> Project Settings -> API Keys
//     - Project URL      looks like  https://abcdxyz.supabase.co
//     - Publishable key  looks like  sb_publishable_...
//       (an older project may show an "anon" key instead; that works too)
//
// These two values are PUBLIC. It is normal and safe for them to be
// visible in the browser. The private poems are protected by the server,
// not by hiding these values.
//
// NEVER paste any of these in this file (or any other file in js/):
//   - a "secret" key   (sb_secret_...)
//   - a "service_role" key
//   - your private PIN / passphrase
// =====================================================================

export const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";

export const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY_HERE";

// Name of the Edge Function you deploy (see README). Leave as it is.
export const PRIVATE_FUNCTION_NAME = "verify-private-pin";

// Returns true only when you have replaced both placeholders above.
export function isSupabaseConfigured() {
  const url = String(SUPABASE_URL).trim();
  const key = String(SUPABASE_PUBLISHABLE_KEY).trim();
  return (
    url.startsWith("https://") &&
    !url.includes("PASTE_") &&
    key.length > 0 &&
    !key.includes("PASTE_")
  );
}
