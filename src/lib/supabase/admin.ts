import { createClient } from "@supabase/supabase-js";
import type { LooseSupabaseClient } from "@/lib/supabase/loose-types";

type SupabaseAdminClient = LooseSupabaseClient;

let serviceRoleClient: SupabaseAdminClient | null = null;

export function getServiceRoleClient(): SupabaseAdminClient {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  serviceRoleClient = client;
  return client;
}