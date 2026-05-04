import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Crée automatiquement un projet quand un client passe au statut "gagné".
 * Vérifie qu'un projet n'existe pas déjà pour éviter les doublons.
 *
 * Utilisé dans clients/[id]/page.tsx et clients/nouveau/page.tsx.
 */
export async function autoCreateProjectIfWon(
  supabase: SupabaseClient,
  params: {
    clientId: string;
    company: string | null;
    lastName: string;
    estimatedAmount: number;
    githubUrl: string | null;
    notes: string | null;
    userId?: string;
  }
) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", params.clientId)
    .maybeSingle();

  if (existing) return existing;

  const { data } = await supabase
    .from("projects")
    .insert({
      name: `Projet - ${params.company || params.lastName}`,
      client_id: params.clientId,
      status: "en_attente",
      budget: params.estimatedAmount,
      github_url: params.githubUrl,
      created_by: params.userId,
      description: params.notes,
    })
    .select("id")
    .single();

  return data;
}
