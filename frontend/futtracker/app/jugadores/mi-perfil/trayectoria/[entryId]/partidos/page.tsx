import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { groupMatchesByYear } from "@/app/jugadores/mi-perfil/trayectoria/matchStatsView";
import YearTabs from "@/app/jugadores/mi-perfil/trayectoria/YearTabs";
import CareerTotalsStrip from "@/components/player/CareerTotalsStrip";
import Toast from "@/components/ui/Toast";
import { getCareerEntryById } from "@/lib/data/careerEntries";
import { getCareerTotals, getMatchStats } from "@/lib/data/stats";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partidos cargados · FutTracker" };

// Sin `loading.tsx` en este segmento: mismo motivo que
// /jugadores/[id]/page.tsx y que .../[entryId]/editar/page.tsx — un
// `loading.tsx` acá rompería el 404 real del requisito 10.
export default async function CareerEntryMatchesPage({
  params,
  searchParams,
}: PageProps<"/jugadores/mi-perfil/trayectoria/[entryId]/partidos">) {
  const { entryId } = await params;
  const query = await searchParams;
  // Requisito 9: mismo patrón de toast por query param que
  // `trayectoria/page.tsx` — ver el comentario ahí.
  const successMessage =
    query.guardado === "partido"
      ? "Guardamos el partido."
      : query.eliminado === "partido"
        ? "Eliminamos el partido."
        : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.careerMatches(entryId)}`);
  }

  const entry = await getCareerEntryById(supabase, entryId);

  if (!entry || entry.player_id !== user.id) {
    notFound();
  }

  const [matches, totals] = await Promise.all([
    getMatchStats(supabase, entryId),
    getCareerTotals(supabase, user.id),
  ]);
  const groups = groupMatchesByYear(matches);

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
        {successMessage ? <Toast message={successMessage} /> : null}

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Partidos cargados
          </h1>
          <p className="text-sm text-zinc-500">
            Cada partido que cargás suma a tus totales de carrera y al resumen
            por año de tu trayectoria en {entry.club_name}.
          </p>
        </div>

        <CareerTotalsStrip
          totals={totals}
          description="Se calculan de los partidos cargados, no se editan a mano."
          action={
            <Link
              href={RouteConstants.profile.careerMatchNew(entryId)}
              className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
            >
              + Cargar partido
            </Link>
          }
        />

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-zinc-900">
                Todavía no cargaste partidos en esta etapa
              </p>
              <p className="max-w-sm text-sm text-zinc-500">
                Empezá por el último que jugaste. Los huecos entre partidos no
                son un problema.
              </p>
              <Link
                href={RouteConstants.profile.careerMatchNew(entryId)}
                className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
              >
                Cargá tu primer partido
              </Link>
            </div>
          ) : (
            <YearTabs entryId={entryId} groups={groups} />
          )}
        </div>
      </div>
    </div>
  );
}
