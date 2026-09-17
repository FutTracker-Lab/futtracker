import Link from "next/link";
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

// Id fijo: la sección aparece una sola vez por perfil, así que no hace falta
// `useId()` (que además no puede usarse en un Server Component async).
const HEADING_ID = "career-timeline-heading";

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
  // FUT-92: cablea el botón "+ Agregar club", antes deshabilitado con el
  // aviso "La carga de etapas llega en la próxima entrega." Sin esto (en la
  // lectura de un visitante que no es dueño) el botón directamente no se
  // renderiza — misma condición que antes.
  addHref?: string;
  // Slot por fila para Editar/Partidos/Eliminar (requisito 1). Solo lo pasa
  // la pantalla de gestión (`trayectoria/page.tsx`); el timeline de
  // solo-lectura del perfil público no lo usa.
  renderActionsSlot?: (entry: CareerTimelineEntry) => ReactNode;
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
  addHref,
  renderActionsSlot,
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
    // `aria-labelledby` y no `aria-label`: con las dos cosas el lector de
    // pantalla anuncia "Trayectoria" dos veces, una por la región y otra por
    // el encabezado. Apuntando al <h2> hay un solo nombre accesible.
    <section className="flex flex-col gap-4" aria-labelledby={HEADING_ID}>
      {totalsSlot}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {/* "Etapas" y no "Trayectoria": así lo titula la tarjeta en el
                diseño, y el <h1> de la pantalla ya dice "Tu trayectoria". */}
            <h2
              id={HEADING_ID}
              className="text-lg font-semibold text-zinc-900"
            >
              Etapas
            </h2>
            {entries.length > 0 ? (
              <p className="text-sm text-zinc-500">
                {entries.length === 1 ? "1 club" : `${entries.length} clubes`}
              </p>
            ) : null}
          </div>
          {isOwner && entries.length > 0 && addHref ? (
            <Link
              href={addHref}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              + Agregar club
            </Link>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <CareerTimelineEmptyState isOwner={isOwner} addHref={addHref} />
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((entry) => (
              <CareerTimelineItem
                key={entry.id}
                entry={entry}
                statsSlot={renderStatsSlot?.(entry)}
                actionsSlot={renderActionsSlot?.(entry)}
              />
            ))}
            {collapsed.length > 0 ? (
              <CareerTimelineExpand>
                {collapsed.map((entry) => (
                  <CareerTimelineItem
                    key={entry.id}
                    entry={entry}
                    statsSlot={renderStatsSlot?.(entry)}
                    actionsSlot={renderActionsSlot?.(entry)}
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
