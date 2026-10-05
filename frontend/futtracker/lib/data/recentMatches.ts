import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type RecentMatch = Tables<"match_stats"> & {
  // El club sale de la etapa, no del partido: `match_stats` solo guarda el
  // rival.
  career_entries: Pick<Tables<"career_entries">, "club_name"> | null;
};

/**
 * Los últimos partidos de un jugador, de todos sus clubes.
 *
 * Fetcher propio y no una extensión de `getMatchStats` (lib/data/stats.ts,
 * T06a): ese archivo es entregable de otro ticket ya mergeado y su lector
 * filtra por `career_entry_id`, que es lo que necesita la pantalla de
 * partidos. Acá hace falta lo contrario —todos los clubes de un jugador— y
 * además el nombre del club embebido, así que el embed vive en un fetcher
 * nuevo en vez de tocar el de T06a.
 */
export async function getRecentMatches(
  client: Client,
  playerId: string,
  limit = 5,
): Promise<RecentMatch[]> {
  const { data, error } = await client
    .from("match_stats")
    .select("*, career_entries(club_name)")
    .eq("player_id", playerId)
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  // El embed dinámico no lo infiere el cliente tipado de Supabase — mismo
  // patrón que `getCareerTimelineEntries`.
  return data as unknown as RecentMatch[];
}
