import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import CareerTimeline from "@/components/player/CareerTimeline";
import CareerTimelineSkeleton from "@/components/player/CareerTimelineSkeleton";
import CareerTotalsStrip from "@/components/player/CareerTotalsStrip";
import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import SeasonSummaryBlock from "@/components/player/SeasonSummaryBlock";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { getCareerTotals, getSeasonStats, type SeasonStats } from "@/lib/data/stats";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

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

export async function generateMetadata({
  params,
}: PageProps<"/jugadores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getPlayerProfileById(id);

  return { title: data?.profile.full_name ?? "FutTracker" };
}

// Sin `loading.tsx` en este segmento a propósito: un `loading.tsx` abre un
// boundary de Suspense, la respuesta empieza a streamear como 200 y el
// `notFound()` posterior ya no puede cambiar el status. El criterio de
// aceptación de FUT-87 pide 404 real para un id inexistente, y eso solo se
// consigue resolviendo antes de que arranque el stream. Las rutas que no
// llaman a `notFound()` (/jugadores/mi-perfil) sí conservan su skeleton.
//
// La ruta ya está protegida por proxy.ts (redirige a /login sin sesión), así
// que acá solo falta resolver si el visitante es el dueño del perfil, para
// mostrar el botón de editar.
export default async function PlayerProfilePage({
  params,
}: PageProps<"/jugadores/[id]">) {
  const { id } = await params;
  const data = await getPlayerProfileById(id);

  if (!data) {
    notFound();
  }

  const { profile, player, avatarUrl } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  // Requisito 8 de FUT-92: la franja de totales de carrera arriba del perfil,
  // siempre leída de `player_career_totals` (nunca recalculada acá). Solo
  // tiene sentido si hay ficha de jugador — sin `player` no hay `player.id`
  // que consultar.
  const totals = player ? await getCareerTotals(supabase, player.id) : null;
  const seasonsByEntry = player
    ? groupSeasonsByEntry(await getSeasonStats(supabase, player.id))
    : new Map<string, SeasonStats[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PlayerProfileHeader
          profile={profile}
          isOwner={isOwner}
          hasPlayerRow={player !== null}
          avatarUrl={avatarUrl}
        />
        {isOwner ? (
          <Link
            href={RouteConstants.profile.edit}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            {player ? "Editar perfil" : "Completá tu perfil"}
          </Link>
        ) : null}
      </div>
      {player ? (
        <PlayerProfileDetails
          player={player}
          // FUT-91: ocupa el slot que ya dejaba PlayerProfileDetails para la
          // trayectoria. Envuelto en su propio <Suspense> (nota técnica del
          // ticket) para que el encabezado de arriba no espere a que
          // resuelva esta consulta aparte.
          careerSlot={
            <Suspense fallback={<CareerTimelineSkeleton />}>
              <CareerTimeline
                playerId={player.id}
                isOwner={isOwner}
                // Requisito 8 de FUT-92: la franja de "Totales de carrera" y
                // el resumen por año de cada etapa, en los mismos slots que
                // ya reservaba FUT-91 — no se reescribe `CareerTimeline`.
                totalsSlot={<CareerTotalsStrip totals={totals} />}
                renderStatsSlot={(entry: CareerTimelineEntry) => (
                  <SeasonSummaryBlock
                    seasons={seasonsByEntry.get(entry.id) ?? []}
                  />
                )}
                // El dueño puede agregar una etapa desde su propio perfil
                // público, igual que desde /trayectoria. Sin acciones de
                // Editar/Eliminar por fila acá: esas son de la pantalla de
                // gestión (requisito 1), no del perfil público.
                addHref={
                  isOwner ? RouteConstants.profile.careerNew : undefined
                }
              />
            </Suspense>
          }
        />
      ) : null}
    </div>
  );
}
