import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { positionSchema } from "@/lib/data/players";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Contrato de T09a (FUT-108): se va, junto con el cast de la llamada, cuando se regeneren los tipos.
export type PlayerSearchRow = {
  player_id: string;
  full_name: string;
  avatar_path: string | null;
  position: string | null;
  age: number | null;
  city: string | null;
  province: string | null;
  matches_played: number;
  is_seeking_team: boolean;
  distance_km: number;
  total_count: number;
};

export const searchPlayersParamsSchema = z.object({
  radius: z.number().int().min(1).max(200),
  position: positionSchema.nullable(),
  seekingOnly: z.boolean(),
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().min(0),
});

export type SearchPlayersParams = z.infer<typeof searchPlayersParamsSchema>;

export type SearchPlayersResult =
  | { status: "ok"; rows: PlayerSearchRow[]; total: number }
  | { status: "origin_missing" };

export async function searchPlayers(
  client: Client,
  params: SearchPlayersParams,
): Promise<SearchPlayersResult> {
  const values = searchPlayersParamsSchema.parse(params);

  const { data, error } = await (client as unknown as SupabaseClient).rpc(
    "search_players",
    {
      p_radius_km: values.radius,
      p_position: values.position,
      p_seeking_only: values.seekingOnly,
      p_limit: values.limit,
      p_offset: values.offset,
    },
  );

  if (error) {
    if (error.code === "P0001" && error.message === "search_origin_missing") {
      return { status: "origin_missing" };
    }
    throw error;
  }

  const rows = (data ?? []) as PlayerSearchRow[];

  return { status: "ok", rows, total: rows[0]?.total_count ?? 0 };
}
