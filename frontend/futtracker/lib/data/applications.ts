import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateAge } from "@/lib/format/age";
import type { Database } from "@/lib/supabase/database.types";

// Contrato de T11a (FUT-123) escrito antes de la tabla: cuando entre, manda su versión.

type Client = SupabaseClient<Database>;

export type VacancyApplication = {
  id: string;
  vacancy_id: string;
  vacancy: { position: string; status: string };
  player_id: string;
  full_name: string;
  avatar_path: string | null;
  position: string | null;
  city: string | null;
  age: number | null;
  created_at: string;
};

export async function listVacancyApplications(
  client: Client,
  { teamId, vacancyId }: { teamId: string; vacancyId?: string },
): Promise<VacancyApplication[]> {
  let query = client
    .from("vacancy_applications")
    .select(
      "id, vacancy_id, player_id, created_at, vacancies!inner(id, position, status, team_id), players!inner(birth_date, position, city, profiles!inner(full_name, avatar_path))",
    )
    .eq("vacancies.team_id", teamId);

  if (vacancyId) {
    query = query.eq("vacancy_id", vacancyId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    vacancy_id: row.vacancy_id,
    vacancy: { position: row.vacancies.position, status: row.vacancies.status },
    player_id: row.player_id,
    full_name: row.players.profiles.full_name,
    avatar_path: row.players.profiles.avatar_path,
    position: row.players.position,
    city: row.players.city,
    age: calculateAge(row.players.birth_date),
    created_at: row.created_at,
  }));
}

export async function countApplicationsByVacancy(
  client: Client,
  teamId: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("vacancies")
    .select("id, vacancy_applications(count)")
    .eq("team_id", teamId);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    data.map((vacancy) => [vacancy.id, vacancy.vacancy_applications[0]?.count ?? 0]),
  );
}
