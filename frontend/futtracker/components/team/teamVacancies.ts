import { listTeamVacancies, type Vacancy } from "@/lib/data/vacancies";
import type { createClient } from "@/lib/supabase/server";

// No se propaga a error.tsx: rompería también "Datos del club" (requisito 12).
export type TeamVacanciesResult =
  | { ok: true; vacancies: Vacancy[] }
  | { ok: false };

export function loadTeamVacancies(
  client: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
): Promise<TeamVacanciesResult> {
  return listTeamVacancies(client, teamId).then(
    (vacancies) => ({ ok: true, vacancies }),
    () => ({ ok: false }),
  );
}

export function countOpen(vacancies: Vacancy[]): number {
  return vacancies.filter((vacancy) => vacancy.status === "open").length;
}
