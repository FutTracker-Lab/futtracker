import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Position } from "@/lib/data/players";
import type { Database } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Sugerencias de equipos (T12a): cliente tipado de la función `suggest_teams`.
// ---------------------------------------------------------------------------

type Client = SupabaseClient<Database>;

// Los topes repiten las validaciones de la función a propósito, como en
// `searchPlayersParamsSchema`: acá frenan un parámetro inválido antes del viaje
// a la base. Si cambia uno, cambia el otro.
export const SUGGEST_MAX_RADIUS_KM = 200;
export const SUGGEST_MAX_LIMIT = 50;

// Los defaults son los de la función (supuesto 3: 25 km).
export const suggestTeamsParamsSchema = z.object({
  radius: z.number().int().min(1).max(SUGGEST_MAX_RADIUS_KM).default(25),
  limit: z.number().int().min(1).max(SUGGEST_MAX_LIMIT).default(10),
  offset: z.number().int().min(0).default(0),
});

export type SuggestTeamsParams = z.input<typeof suggestTeamsParamsSchema>;

// Tipo propio y no el generado: el generador de Supabase marca como no nulas
// todas las columnas que devuelve una función, y `crest_path`, `city`,
// `province`, `category` y `description` pueden venir en null.
export type TeamSuggestion = {
  vacancy_id: string;
  team_id: string;
  team_name: string;
  crest_path: string | null;
  city: string | null;
  province: string | null;
  category: string | null;
  position: Position;
  modality: string;
  level: string;
  description: string | null;
  distance_km: number;
  applied: boolean;
};

/**
 * Las fallas esperables de las sugerencias, que la pantalla muestra como
 * estados propios en vez de como error (requisito 11). Son las claves de
 * `suggestions.errors.*`:
 *
 * - `completeProfile`: el jugador no tiene ficha, o la tiene sin posición.
 * - `missingLocation`: la ficha no tiene zona, así que no hay desde dónde medir.
 * - `playersOnly`: la cuenta no es de jugador.
 */
export type SuggestTeamsFailure =
  | "completeProfile"
  | "missingLocation"
  | "playersOnly";

export type SuggestTeamsResult =
  | { ok: true; rows: TeamSuggestion[]; total: number }
  | { ok: false; reason: SuggestTeamsFailure };

/**
 * Traduce el error de `suggest_teams` a una falla esperable, o null si es
 * cualquier otra cosa.
 *
 * Se mira el código **y** el mensaje, como en `mapSearchPlayersError`: un
 * `42501` sin `suggestions_players_only` es, por ejemplo, un grant que falta,
 * y mostrarlo como "solo para jugadores" escondería el bug.
 */
export function mapSuggestTeamsError(
  error: unknown,
): SuggestTeamsFailure | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "P0001") {
    if (
      message === "suggestion_profile_incomplete" ||
      message === "suggestion_position_missing"
    ) {
      return "completeProfile";
    }

    if (message === "suggestion_origin_missing") {
      return "missingLocation";
    }
  }

  if (code === "42501" && message === "suggestions_players_only") {
    return "playersOnly";
  }

  return null;
}

/**
 * Vacantes abiertas de la posición del jugador con sesión, en equipos dentro
 * del radio, de la más cercana a la más lejana.
 *
 * Las fallas esperables vuelven como valor (`ok: false`) para que la pantalla
 * muestre su estado; cualquier otro error se lanza. Un parámetro inválido
 * también se lanza: la pantalla nunca debería mandar uno.
 *
 * `total` sale de la primera fila. Con una página vacía (un `offset` más allá
 * del último resultado) no hay fila de donde leerlo y vale 0.
 */
export async function suggestTeams(
  client: Client,
  params: SuggestTeamsParams = {},
): Promise<SuggestTeamsResult> {
  const parsed = suggestTeamsParamsSchema.parse(params);

  const { data, error } = await client.rpc("suggest_teams", {
    p_radius_km: parsed.radius,
    p_limit: parsed.limit,
    p_offset: parsed.offset,
  });

  if (error) {
    const reason = mapSuggestTeamsError(error);

    if (reason) {
      return { ok: false, reason };
    }

    throw error;
  }

  const results = data ?? [];

  return {
    ok: true,
    // Lista explícita de campos: si la función empezara a devolver una
    // columna nueva, no se filtra sola hacia la pantalla.
    rows: results.map((row) => ({
      vacancy_id: row.vacancy_id,
      team_id: row.team_id,
      team_name: row.team_name,
      crest_path: row.crest_path,
      city: row.city,
      province: row.province,
      category: row.category,
      position: row.position as Position,
      modality: row.modality,
      level: row.level,
      description: row.description,
      distance_km: row.distance_km,
      applied: row.applied,
    })),
    total: results[0]?.total_count ?? 0,
  };
}
