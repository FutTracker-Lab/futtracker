import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import SearchPagination from "@/components/search/SearchPagination";
import MyApplicationsList from "@/components/vacancies/MyApplicationsList";
import VacancyApplyControl from "@/components/vacancies/VacancyApplyControl";
import VacancyBoardTabs from "@/components/vacancies/VacancyBoardTabs";
import VacancyCard from "@/components/vacancies/VacancyCard";
import VacancyBoardSkeleton from "@/components/vacancies/VacancyBoardSkeleton";
import VacancyFilters from "@/components/vacancies/VacancyFilters";
import { LINK_CLASS } from "@/components/vacancies/styles";
import { getPlayerAccess } from "@/lib/auth/playerAccess";
import { listMyApplications } from "@/lib/data/applications";
import { getMyPlayer } from "@/lib/data/players";
import { getCrestSignedUrls } from "@/lib/data/teams";
import { listOpenVacancies } from "@/lib/data/vacancies";
import { openVacanciesSubtitle } from "@/lib/format/applicationLabels";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  parseVacancyBoardParams,
  toListOpenVacanciesParams,
  vacanciesHref,
  vacanciesPageCount,
  type VacancyBoardCriteria,
  type VacancyBoardTab,
} from "@/lib/vacancies/params";

export default async function VacanciesPage({ searchParams }: PageProps<"/vacantes">) {
  // El layout corre en paralelo: sin esto, el 404 del delegado igual trae las vacantes en el payload.
  const access = await getPlayerAccess();

  if (access === "unavailable") {
    throw new Error("No se pudo leer el rol");
  }

  if (access !== "player") {
    notFound();
  }

  const criteria = parseVacancyBoardParams(await searchParams);
  const key = `${criteria.tab}:${vacanciesHref(criteria, criteria.page)}`;

  // loading.tsx no aparece si solo cambian los parámetros; el `key` remonta el Suspense.
  return (
    <Suspense key={key} fallback={<VacancyBoardSkeleton />}>
      {criteria.tab === "postulaciones" ? (
        <MyApplicationsResults />
      ) : (
        <OpenVacanciesResults criteria={criteria} />
      )}
    </Suspense>
  );
}

async function OpenVacanciesResults({ criteria }: { criteria: VacancyBoardCriteria }) {
  const supabase = await createClient();

  const [{ vacancies, total }, applications, player] = await Promise.all([
    listOpenVacancies(supabase, toListOpenVacanciesParams(criteria)).catch((error) => {
      // Con un offset más allá del total, PostgREST no devuelve 0 filas: responde PGRST103.
      if (criteria.page > 1 && error?.code === "PGRST103") {
        redirect(vacanciesHref(criteria, 1));
      }
      throw error;
    }),
    listMyApplications(supabase),
    getMyPlayer(supabase),
  ]);

  if (vacancies.length === 0 && criteria.page > 1) {
    redirect(vacanciesHref(criteria, 1));
  }

  const crestUrls = await getCrestSignedUrls(
    supabase,
    vacancies.flatMap((vacancy) => (vacancy.teams?.crest_path ? [vacancy.teams.crest_path] : [])),
  );
  const appliedIds = new Set(applications.map((application) => application.vacancy.id));

  return (
    <BoardLayout active="abiertas" subtitle={openVacanciesSubtitle(total)}>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <VacancyFilters position={criteria.position} />

        <div className="flex min-w-0 flex-col gap-4">
          {vacancies.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              {criteria.position ? (
                <>
                  <p className="text-zinc-700">No hay vacantes abiertas para esa posición.</p>
                  <Link href={RouteConstants.vacancies.board} className={LINK_CLASS}>
                    Ver todas
                  </Link>
                </>
              ) : (
                <p className="text-zinc-700">Todavía no hay vacantes abiertas.</p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {vacancies.map((vacancy) => {
                const team = vacancy.teams;
                if (!team) return null;

                return (
                  <VacancyCard
                    key={vacancy.id}
                    vacancy={{ ...vacancy, teams: team }}
                    crestUrl={team.crest_path ? (crestUrls.get(team.crest_path) ?? null) : null}
                    action={
                      <VacancyApplyControl
                        vacancyId={vacancy.id}
                        positionLabel={getPositionLabel(vacancy.position) ?? vacancy.position}
                        teamName={team.name}
                        applied={appliedIds.has(vacancy.id)}
                        hasPlayerProfile={player !== null}
                      />
                    }
                  />
                );
              })}
            </ul>
          )}

          <SearchPagination
            page={criteria.page}
            totalPages={vacanciesPageCount(total)}
            hrefFor={(page) => vacanciesHref(criteria, page)}
          />
        </div>
      </div>
    </BoardLayout>
  );
}

async function MyApplicationsResults() {
  const supabase = await createClient();
  const applications = await listMyApplications(supabase);

  const crestUrls = await getCrestSignedUrls(
    supabase,
    applications.flatMap((application) =>
      application.vacancy.team.crest_path ? [application.vacancy.team.crest_path] : [],
    ),
  );

  return (
    <BoardLayout active="postulaciones">
      <MyApplicationsList
        applications={applications.map((application) => {
          const path = application.vacancy.team.crest_path;
          return { ...application, crestUrl: path ? (crestUrls.get(path) ?? null) : null };
        })}
      />
    </BoardLayout>
  );
}

function BoardLayout({
  active,
  subtitle,
  children,
}: {
  active: VacancyBoardTab;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Vacantes</h1>
          {subtitle ? <p className="text-zinc-600">{subtitle}</p> : null}
        </header>
        <VacancyBoardTabs active={active} />
        {children}
      </div>
    </div>
  );
}
