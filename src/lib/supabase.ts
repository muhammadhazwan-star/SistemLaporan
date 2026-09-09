import { createClient } from "@supabase/supabase-js";

// Supabase project config (PRD §10: cloud database + file storage).
// The publishable key is safe for browser/client use; for storage uploads we rely
// on the bucket being configured as public-write (or use RLS policies server-side).
export const SUPABASE_URL = "https://briqnbwwfztfphyivefq.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A9Dnyf7ZeWaOfCM8KWsx2g_HekPYRvR";

// Bucket name for course activity photos
export const UPLOADS_BUCKET = "uploads";

// Server-side Supabase client (uses the publishable key — works for public buckets)
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
