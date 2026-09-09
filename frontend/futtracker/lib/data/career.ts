import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type CareerEntry = Tables<"career_entries">;

export async function getCareerEntries(
  client: Client,
  playerId: string,
): Promise<CareerEntry[]> {
  const { data, error } = await client
    .from("career_entries")
    .select("*")
    .eq("player_id", playerId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
