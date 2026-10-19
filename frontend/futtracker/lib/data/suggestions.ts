import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SEARCH_MAX_LIMIT, SEARCH_MAX_RADIUS_KM } from "@/lib/data/players";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export const suggestTeamsParamsSchema = z.object({
  radiusKm: z.number().int().min(1).max(SEARCH_MAX_RADIUS_KM).default(25),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).default(10),
  offset: z.number().int().min(0).default(0),
});

export type SuggestTeamsParams = z.input<typeof suggestTeamsParamsSchema>;

export type SuggestionRow = {
  vacancy_id: string;
  team_id: string;
  team_name: string;
  crest_path: string | null;
  city: string | null;
  province: string | null;
  category: string | null;
  position: string;
  modality: string;
  level: string;
  description: string | null;
  distance_km: number;
  applied: boolean;
};

type SuggestTeamsDbRow = SuggestionRow & { total_count: number };

type SuggestTeamsRpc = (
  fn: "suggest_teams",
  args: { p_radius_km: number; p_limit: number; p_offset: number },
) => PromiseLike<{ data: SuggestTeamsDbRow[] | null; error: PostgrestError | null }>;

export type SuggestTeamsFailure = "completeProfile" | "missingLocation" | "playersOnly";

export type SuggestTeamsResult =
  | { ok: true; rows: SuggestionRow[]; total: number }
  | { ok: false; reason: SuggestTeamsFailure };

// Código y mensaje juntos: un 42501 sin `suggestions_players_only` es un grant faltante, no un delegado.
export function mapSuggestTeamsError(error: unknown): SuggestTeamsFailure | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const { code, message } = error as { code?: string; message?: string };

  if (
    code === "P0001" &&
    (message === "suggestion_profile_incomplete" || message === "suggestion_position_missing")
  ) {
    return "completeProfile";
  }

  if (code === "P0001" && message === "suggestion_origin_missing") {
    return "missingLocation";
  }

  if (code === "42501" && message === "suggestions_players_only") {
    return "playersOnly";
  }

  return null;
}

export async function suggestTeams(
  client: Client,
  params: SuggestTeamsParams,
): Promise<SuggestTeamsResult> {
  const parsed = suggestTeamsParamsSchema.parse(params);

  // `suggest_teams` es de T12a y todavía no está en database.types.ts; al regenerarlos, sacar el cast.
  const { data, error } = await (client as unknown as { rpc: SuggestTeamsRpc }).rpc(
    "suggest_teams",
    { p_radius_km: parsed.radiusKm, p_limit: parsed.limit, p_offset: parsed.offset },
  );

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
    // Lista explícita: una columna nueva de la función no se filtra sola hacia la pantalla.
    rows: results.map((row) => ({
      vacancy_id: row.vacancy_id,
      team_id: row.team_id,
      team_name: row.team_name,
      crest_path: row.crest_path,
      city: row.city,
      province: row.province,
      category: row.category,
      position: row.position,
      modality: row.modality,
      level: row.level,
      description: row.description,
      distance_km: row.distance_km,
      applied: row.applied,
    })),
    total: results[0]?.total_count ?? 0,
  };
}
