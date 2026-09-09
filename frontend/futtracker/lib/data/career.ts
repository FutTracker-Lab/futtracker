import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CareerEntry = Tables<"career_entries">;

export async function getCareerEntries(
  playerId: string,
): Promise<CareerEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
