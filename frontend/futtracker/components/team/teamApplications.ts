import type { TeamVacanciesResult } from "@/components/team/teamVacancies";
import {
  countApplicationsByVacancy,
  listVacancyApplications,
  type VacancyApplication,
} from "@/lib/data/applications";
import { getAvatarSignedUrls } from "@/lib/data/players";
import type { Vacancy } from "@/lib/data/vacancies";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ApplicationRow = VacancyApplication & { avatarUrl: string | null };

export type TeamApplicationsResult =
  | { ok: true; applications: ApplicationRow[]; vacancies: Vacancy[]; vacancyId: string | null }
  | { ok: false };

export type ApplicationCountsResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false };

export async function loadTeamApplications(
  client: Client,
  teamId: string,
  vacancies: Promise<TeamVacanciesResult>,
  requestedVacancyId: string | undefined,
): Promise<TeamApplicationsResult> {
  try {
    const loaded = await vacancies;

    if (!loaded.ok) {
      return { ok: false };
    }

    // Uno de otro equipo o que no es un uuid no está en la lista: se ignora.
    const vacancyId =
      loaded.vacancies.find((vacancy) => vacancy.id === requestedVacancyId)?.id ?? null;
    const applications = await listVacancyApplications(client, {
      teamId,
      vacancyId: vacancyId ?? undefined,
    });
    // Sin firma se muestran las iniciales: no vale la pena perder la lista por eso.
    const avatarUrls = await getAvatarSignedUrls(
      client,
      applications.map((application) => application.avatar_path),
    ).catch(() => ({}) as Record<string, string>);

    return {
      ok: true,
      vacancies: loaded.vacancies,
      vacancyId,
      applications: applications.map((application) => ({
        ...application,
        avatarUrl: application.avatar_path ? (avatarUrls[application.avatar_path] ?? null) : null,
      })),
    };
  } catch {
    return { ok: false };
  }
}

export function loadApplicationCounts(
  client: Client,
  teamId: string,
): Promise<ApplicationCountsResult> {
  return countApplicationsByVacancy(client, teamId).then(
    (counts) => ({ ok: true, counts }),
    () => ({ ok: false }),
  );
}

export function totalApplications(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
