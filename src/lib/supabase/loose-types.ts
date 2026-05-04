import type { SupabaseClient } from "@supabase/supabase-js";

export type LooseSupabaseClient = SupabaseClient<any, "public", any, any, any>;