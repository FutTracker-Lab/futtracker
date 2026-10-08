import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import ApplicationsSkeleton from "@/components/team/ApplicationsSkeleton";
import ApplicationsTab from "@/components/team/ApplicationsTab";
import OpenVacanciesChip from "@/components/team/OpenVacanciesChip";
import TeamForm from "@/components/team/TeamForm";
import TeamTabs, { type TeamTab } from "@/components/team/TeamTabs";
import VacanciesSkeleton from "@/components/team/VacanciesSkeleton";
import VacanciesTab from "@/components/team/VacanciesTab";
import { loadApplicationCounts, loadTeamApplications } from "@/components/team/teamApplications";
import { loadTeamVacancies } from "@/components/team/teamVacancies";
import { getProfileById } from "@/lib/data/profiles";
import { getMyTeam } from "@/lib/data/teams";
import { getTeamProfileById } from "@/lib/data/teamProfiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * La pantalla de gestión del equipo del delegado.
 *
 * El ticket (requisito 4) la describe como el perfil de solo lectura con un
 * botón "Editar equipo", pero el diseño de referencia muestra otra cosa: el
 * formulario embebido, con el nombre del club como título y un botón "Ver
 * perfil público" que lleva a `/equipos/[id]`. Se sigue el diseño, que es lo
 * que le da sentido a ese botón — si esta pantalla fuera de solo lectura,
 * llevaría a una página idéntica a la que ya se está viendo.
 *
 * `/equipos/[id]/editar` sigue existiendo con el mismo formulario: el
 * requisito 5 la pide y es la ruta que responde 404 a quien no es dueño.
 *
 * Cada delegado tiene un solo equipo (decisión 1.2), así que no hay selector.
 */
export default async function MyTeamPage({
  searchParams,
}: PageProps<"/equipos/mi-equipo">) {
  const params = await searchParams;
  // Lo pone el redirect de /equipos/nuevo cuando el delegado ya tiene equipo
  // (requisito 6): sin el aviso, volver acá sin explicación parece un bug.
  const alreadyHasTeam = params.aviso === "equipo-existente";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.team.mine}`);
  }

  // Un jugador no puede tener equipo, así que sin este chequeo veía el estado
  // vacío invitándolo a crear uno — y /equipos/nuevo después lo rebotaba con
  // el mensaje de permiso. Se va a su propia sección, igual que hace
  // /jugadores/mi-perfil con un delegado.
  const profile = await getProfileById(user.id);

  if (profile?.role !== "delegate") {
    redirect(RouteConstants.profile.mine);
  }

  const myTeam = await getMyTeam(supabase);

  if (!myTeam) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 p-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Todavía no tenés equipo
          </h1>
          <p className="text-sm text-zinc-600">
            Creá el perfil de tu club para que los jugadores de tu zona puedan
            encontrarlo.
          </p>
          <Link
            href={RouteConstants.team.new}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
          >
            Creá tu equipo
          </Link>
        </div>
      </div>
    );
  }

  // Vuelve por `getTeamProfileById` para traer la URL firmada del escudo, que
  // `getMyTeam` no resuelve.
  const data = await getTeamProfileById(myTeam.id);

  if (!data) {
    redirect(RouteConstants.team.new);
  }

  const { team, crestUrl } = data;
  const tab: TeamTab =
    params.tab === "vacantes" || params.tab === "postulaciones" ? params.tab : "datos";
  // Sin `await`: la esperan el chip, el contador y la tabla, cada uno en su Suspense.
  const vacancies = loadTeamVacancies(supabase, team.id);
  const applicationCounts = loadApplicationCounts(supabase, team.id);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        {alreadyHasTeam ? (
          <p
            role="status"
            className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-sm text-zinc-900"
          >
            Ya tenés un equipo creado.
          </p>
        ) : null}

        <div className="flex flex-col items-start gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {team.name}
          </h1>
          <p className="text-sm text-zinc-600">
            Modo Equipo. Lo que editás acá es lo que ven los jugadores cuando
            les aparece el club en una búsqueda.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Suspense fallback={null}>
              <OpenVacanciesChip result={vacancies} />
            </Suspense>
            <Link
              href={RouteConstants.team.view(team.id)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Ver perfil público
            </Link>
          </div>
        </div>

        <TeamTabs active={tab} vacancies={vacancies} applicationCounts={applicationCounts} />

        {tab === "vacantes" ? (
          <Suspense fallback={<VacanciesSkeleton />}>
            <VacanciesTab result={vacancies} applicationCounts={applicationCounts} />
          </Suspense>
        ) : tab === "postulaciones" ? (
          <Suspense fallback={<ApplicationsSkeleton />}>
            <ApplicationsTab
              result={loadTeamApplications(
                supabase,
                team.id,
                vacancies,
                typeof params.vacante === "string" ? params.vacante : undefined,
              )}
            />
          </Suspense>
        ) : (
          <TeamForm team={team} initialCrestUrl={crestUrl} />
        )}
      </div>
    </div>
  );
}
