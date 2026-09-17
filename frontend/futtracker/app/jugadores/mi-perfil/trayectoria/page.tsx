import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import DeleteCareerEntryButton from "@/app/jugadores/mi-perfil/trayectoria/DeleteCareerEntryButton";
import CareerTimeline from "@/components/player/CareerTimeline";
import CareerTimelineSkeleton from "@/components/player/CareerTimelineSkeleton";
import CareerTotalsStrip from "@/components/player/CareerTotalsStrip";
import SeasonSummaryBlock from "@/components/player/SeasonSummaryBlock";
import ActionsMenu from "@/components/ui/ActionsMenu";
import Toast from "@/components/ui/Toast";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { getCareerTotals, getSeasonStats, type SeasonStats } from "@/lib/data/stats";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu trayectoria · FutTracker" };

// Sin color acá: cada item suma el suyo. Si la base trajera `text-zinc-900`,
// el `text-red-700` del item de borrar no ganaría — las dos clases quedan en
// el atributo y el que manda es el orden del CSS generado, no el del string.
const MENU_ITEM_BASE = "block w-full px-3 py-1.5 text-left text-sm";
const MENU_ITEM = `${MENU_ITEM_BASE} text-zinc-900 hover:bg-zinc-50`;
const MENU_ITEM_DANGER = `${MENU_ITEM_BASE} text-red-700 hover:bg-red-50`;

function groupSeasonsByEntry(seasons: SeasonStats[]): Map<string, SeasonStats[]> {
  const byEntry = new Map<string, SeasonStats[]>();

  for (const season of seasons) {
    if (!season.career_entry_id) continue;
    const group = byEntry.get(season.career_entry_id);
    if (group) {
      group.push(season);
    } else {
      byEntry.set(season.career_entry_id, [season]);
    }
  }

  return byEntry;
}

// Pantalla propia y no una sección más de /jugadores/mi-perfil: en el kit de
// diseño (ScreenTrayectoria.jsx, rotulada T04D) "Mi perfil" y "Trayectoria"
// son dos entradas distintas del sidebar. La CTA del requisito 6 apunta a
// `${career}/nueva`, que confirma que la trayectoria propia cuelga de acá.
//
// El perfil público (/jugadores/[id]) sigue mostrando la misma sección: esa
// es la vista que escanea el delegado. Esta es la del dueño, y desde FUT-92
// también la de gestión (crear/editar/borrar etapas, acceso a "Partidos").
export default async function MyCareerPage({
  searchParams,
}: PageProps<"/jugadores/mi-perfil/trayectoria">) {
  const params = await searchParams;
  // Requisito 9: toast de éxito tras guardar/borrar una etapa. Va por query
  // param (mismo patrón que `?aviso=equipo-existente` en
  // /equipos/mi-equipo) y no por estado local del formulario/botón, porque
  // los dos navegan a esta página y se desmontan antes de que un toast local
  // llegara a verse.
  const successMessage =
    params.guardado === "entrada"
      ? "Guardamos la etapa."
      : params.eliminado === "etapa"
        ? "Eliminamos la etapa."
        : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.career}`);
  }

  const data = await getPlayerProfileById(user.id);

  if (!data) {
    // Mismo criterio que /jugadores/mi-perfil: la cuenta no tiene rol
    // "player" (ej. es delegado). No es un 404, es la ruta equivocada.
    redirect("/");
  }

  const { player } = data;

  if (!player) {
    // Sin fila de jugador no hay trayectoria posible todavía: primero tiene
    // que completar el perfil, que es lo que ya resuelve esa pantalla.
    redirect(RouteConstants.profile.edit);
  }

  const [totals, seasons] = await Promise.all([
    getCareerTotals(supabase, player.id),
    getSeasonStats(supabase, player.id),
  ]);
  const seasonsByEntry = groupSeasonsByEntry(seasons);

  // El diseño no muestra los tres botones sueltos en la fila: muestra un
  // "..." a la derecha que los despliega. Con una etapa por fila, tres
  // acciones visibles en cada una compiten con el dato y ensucian el bloque.
  function renderActionsSlot(entry: CareerTimelineEntry) {
    return (
      <ActionsMenu label={`Acciones de tu etapa en ${entry.club_name}`}>
        <Link href={RouteConstants.profile.careerEdit(entry.id)} className={MENU_ITEM}>
          Editar
        </Link>
        <Link href={RouteConstants.profile.careerMatches(entry.id)} className={MENU_ITEM}>
          Partidos
        </Link>
        <DeleteCareerEntryButton
          entryId={entry.id}
          clubName={entry.club_name}
          triggerClassName={MENU_ITEM_DANGER}
        />
      </ActionsMenu>
    );
  }

  return (
    // `bg-zinc-50` acá y no en el <main> de AppShell: el diseño pide fondo
    // gris con tarjetas blancas, pero cambiarlo en el shell se lo aplica a
    // todas las pantallas de la app y eso excede este ticket.
    <div className="min-h-full bg-zinc-50">
      {/* `max-w-5xl` y no el `max-w-2xl` del resto del perfil: en el diseño
          la tarjeta ocupa cerca de tres cuartos del ancho disponible, no una
          columna angosta centrada. El contenedor más ancho además acerca el
          título al nav, que es como se ve en la referencia. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
        {successMessage ? <Toast message={successMessage} /> : null}

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Tu trayectoria
          </h1>
          <p className="text-sm text-zinc-500">
            Los clubes la miran antes que cualquier otra cosa. Podés cargar
            etapas que se solapen.
          </p>
        </div>

        <Suspense fallback={<CareerTimelineSkeleton />}>
          <CareerTimeline
            playerId={player.id}
            isOwner
            addHref={RouteConstants.profile.careerNew}
            totalsSlot={
              <CareerTotalsStrip
                totals={totals}
                description="Se calculan de los partidos cargados, no se editan a mano."
              />
            }
            renderStatsSlot={(entry) => (
              <SeasonSummaryBlock seasons={seasonsByEntry.get(entry.id) ?? []} />
            )}
            renderActionsSlot={renderActionsSlot}
          />
        </Suspense>
      </div>
    </div>
  );
}
