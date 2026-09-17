import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Tables } from "@/lib/supabase/database.types";


type Client = SupabaseClient<Database>;

export type MatchStat = Tables<"match_stats">;
export type SeasonStats = Tables<"season_stats">;
export type PlayerCareerTotals = Tables<"player_career_totals">;

export const matchStatInputSchema = z.object({
  career_entry_id: z.uuid(),
  match_date: z.iso.date(),
  opponent: z.string().trim().min(2).max(80),
  competition: z.string().trim().min(2).max(80).nullish(),
  started: z.boolean(),
  minutes_played: z.number().int().min(0).max(130),
  goals: z.number().int().min(0).max(20),
  assists: z.number().int().min(0).max(20),
  yellow_cards: z.number().int().min(0).max(2),
  red_cards: z.number().int().min(0).max(1),
  clean_sheet: z.boolean(),
});

export type MatchStatInput = z.infer<typeof matchStatInputSchema>;

export async function getMatchStats(
  client: Client,
  careerEntryId: string,
): Promise<MatchStat[]> {
  const { data, error } = await client
    .from("match_stats")
    .select("*")
    .eq("career_entry_id", careerEntryId)
    .order("match_date", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getSeasonStats(
  client: Client,
  playerId: string,
): Promise<SeasonStats[]> {
  const { data, error } = await client
    .from("season_stats")
    .select("*")
    .eq("player_id", playerId)
    .order("season_year", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getCareerTotals(
  client: Client,
  playerId: string,
): Promise<PlayerCareerTotals | null> {
  const { data, error } = await client
    .from("player_career_totals")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
