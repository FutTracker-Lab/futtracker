import type { SupabaseClient } from "@supabase/supabase-js";

import { listFollowedTeams, type FollowedTeam } from "@/lib/data/follows";
import { POSITIONS } from "@/lib/data/players";
import { getCrestSignedUrls } from "@/lib/data/teams";
import { listOpenVacancies } from "@/lib/data/vacancies";
import type { Database } from "@/lib/supabase/database.types";

export type FollowedTeamItem = FollowedTeam & {
  crestUrl: string | null;
  openPositions: string[];
};

export async function loadFollowedTeams(
  supabase: SupabaseClient<Database>,
): Promise<FollowedTeamItem[]> {
  const teams = await listFollowedTeams(supabase);

  // `in.()` vacío no devuelve vacío: se corta antes.
  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((team) => team.id);
  const [{ vacancies }, crestUrls] = await Promise.all([
    // Una abierta por posición y equipo (T10a): con este tope entran todas.
    listOpenVacancies(supabase, { teamIds, limit: teamIds.length * POSITIONS.length, offset: 0 }),
    getCrestSignedUrls(
      supabase,
      teams.flatMap((team) => (team.crest_path ? [team.crest_path] : [])),
    ).catch(() => new Map<string, string>()),
  ]);

  const positionsByTeam = new Map<string, string[]>();

  for (const vacancy of vacancies) {
    positionsByTeam.set(vacancy.team_id, [
      ...(positionsByTeam.get(vacancy.team_id) ?? []),
      vacancy.position,
    ]);
  }

  return teams.map((team) => ({
    ...team,
    crestUrl: team.crest_path ? (crestUrls.get(team.crest_path) ?? null) : null,
    openPositions: positionsByTeam.get(team.id) ?? [],
  }));
}
