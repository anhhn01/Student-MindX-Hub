import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  console.error("SUPABASE_URL:", supabaseUrl);
  console.error("SUPABASE_ANON_KEY:", supabaseAnonKey);
  // Use fallback for development
}

export const supabase = createClient(
  supabaseUrl || "https://ntwxyemjtjosfzmribok.supabase.co",
  supabaseAnonKey || "sb_publishable_H4h3U8_R3OwV_FbrPKT_RA_XtTpQ2VY"
);