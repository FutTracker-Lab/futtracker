import type { ReactNode } from "react";

import CareerTimelineEmptyState from "@/components/player/CareerTimelineEmptyState";
import CareerTimelineError from "@/components/player/CareerTimelineError";
import CareerTimelineExpand from "@/components/player/CareerTimelineExpand";
import CareerTimelineItem from "@/components/player/CareerTimelineItem";
import { splitVisibleEntries } from "@/components/player/careerTimelineView";
import {
  getCareerTimelineEntries,
  type CareerTimelineEntry,
} from "@/lib/data/careerTimeline";
import { createClient } from "@/lib/supabase/server";

type Props = {
  playerId: string;
  isOwner: boolean;
  // Slot para T06b: la franja "Totales de carrera" que aparece en el diseño
  // por encima de "Etapas" no se calcula ni se renderiza acá (ver "notas de
  // lectura del diseño" del ticket) — este componente solo le reserva el
  // lugar.
  totalsSlot?: ReactNode;
  // Slot por fila para el requisito 4: T06b pasa una función que arma el
  // resumen de partidos/goles/asistencias por año para cada entrada, sin
  // tener que reescribir `CareerTimeline` ni `CareerTimelineItem`.
  renderStatsSlot?: (entry: CareerTimelineEntry) => ReactNode;
};

// Server Component: la consulta corre en el mismo render que el resto del
// perfil (requisito 8), sin cascada de requests del lado del cliente. Se usa
// envuelto en <Suspense> desde /jugadores/[id]/page.tsx para que el
// encabezado del perfil no espere a que esto resuelva.
export default async function CareerTimeline({
  playerId,
  isOwner,
  totalsSlot,
  renderStatsSlot,
}: Props) {
  let entries: CareerTimelineEntry[];

  try {
    const supabase = await createClient();
    entries = await getCareerTimelineEntries(supabase, playerId);
  } catch {
    return <CareerTimelineError />;
  }

  const { visible, collapsed } = splitVisibleEntries(entries);

  return (
    <section className="flex flex-col gap-4" aria-label="Trayectoria">
      {totalsSlot}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Trayectoria
          </h2>
          {isOwner && entries.length > 0 ? (
            // Alta y edición de etapas son de T06b (fuera de alcance acá,
            // ver "Alcance" del ticket): botón inerte para respetar el
            // diseño sin cablear una ruta que todavía no existe.
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              + Agregar club
            </button>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <CareerTimelineEmptyState isOwner={isOwner} />
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((entry) => (
              <CareerTimelineItem
                key={entry.id}
                entry={entry}
                statsSlot={renderStatsSlot?.(entry)}
              />
            ))}
            {collapsed.length > 0 ? (
              <CareerTimelineExpand>
                {collapsed.map((entry) => (
                  <CareerTimelineItem
                    key={entry.id}
                    entry={entry}
                    statsSlot={renderStatsSlot?.(entry)}
                  />
                ))}
              </CareerTimelineExpand>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
