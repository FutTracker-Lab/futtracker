import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type CareerTimelineEntry = Tables<"career_entries"> & {
  // Embed de solo lectura para el requisito 3 de FUT-91 (link al equipo
  // cuando `team_id` está seteado). `crest_path` viaja por si una etapa
  // futura quiere mostrar el escudo junto al nombre; hoy no se usa.
  teams: Pick<Tables<"teams">, "id" | "name" | "crest_path"> | null;
};

// Fetcher propio y no una extensión de `getCareerEntries` (lib/data/career.ts,
// T04c): ese archivo es entregable de otro ticket ya mergeado y aceptado, y
// su `select("*")` sin join se deja intacto a propósito. Acá hace falta el
// equipo linkeado, así que el embed vive en un fetcher nuevo con el mismo
// orden (`is_current` desc, `start_date` desc) en vez de tocar el de T04c.
export async function getCareerTimelineEntries(
  client: Client,
  playerId: string,
): Promise<CareerTimelineEntry[]> {
  const { data, error } = await client
    .from("career_entries")
    .select("*, teams(id, name, crest_path)")
    .eq("player_id", playerId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  // El embed dinámico (`select` armado como string) no lo infiere el cliente
  // tipado de Supabase — el mismo patrón que `getPlayerProfileById` en
  // lib/data/profiles.ts para `profiles(*, players(*))`.
  return data as unknown as CareerTimelineEntry[];
}
