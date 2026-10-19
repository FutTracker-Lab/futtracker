import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Lo que necesita el select del formulario. Sin `latitude` ni `longitude`: las
// coordenadas las usa solo la base (el trigger de T09c y `search_players`).
export type Zone = {
  id: string;
  name: string;
  province: string;
};

/**
 * Las zonas que ofrece el formulario: solo las activas, por provincia y
 * después por nombre.
 *
 * `is_active` decide solo qué se ofrece. La base acepta cualquier `zone_id`
 * del catálogo, así que un perfil con una zona que se desactivó sigue siendo
 * válido.
 */
export async function listZones(client: Client): Promise<Zone[]> {
  const { data, error } = await client
    .from("zones")
    .select("id, name, province")
    .eq("is_active", true)
    .order("province")
    .order("name");

  if (error) {
    throw error;
  }

  return data;
}

// Requisito 9 de T09c. El mensaje y el reconocimiento del error viven acá; las
// Server Actions de jugador y de equipo los usan (T09d).
export const UNKNOWN_ZONE_MESSAGE = "Elegí una zona de la lista.";

/**
 * ¿Es el 23503 de una zona que no existe en el catálogo?
 *
 * Se mira el nombre de la foránea y no solo el código: `teams` y `players`
 * tienen otras foráneas (`owner_id`, `id`) que también dan 23503, y decir
 * "elegí una zona" por cualquiera de ellas mandaría al usuario a arreglar algo
 * que no está roto.
 */
export function isUnknownZoneError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as { code?: string; message?: string };

  return (
    code === "23503" &&
    (message?.includes("players_zone_id_fkey") === true ||
      message?.includes("teams_zone_id_fkey") === true)
  );
}
