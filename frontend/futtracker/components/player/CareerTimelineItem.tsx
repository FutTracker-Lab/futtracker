import Link from "next/link";
import type { ReactNode } from "react";

import { getClubHref } from "@/components/player/careerTimelineView";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";
import { formatCareerPeriod } from "@/lib/format/dates";
import { getPositionLabel } from "@/lib/format/playerLabels";

type Props = {
  entry: CareerTimelineEntry;
  // Slot por fila para el requisito 4 de FUT-91: T06b monta acá el resumen
  // de partidos/goles/asistencias por año, sin reescribir este componente.
  statsSlot?: ReactNode;
};

export default function CareerTimelineItem({ entry, statsSlot }: Props) {
  const href = getClubHref(entry);
  const positionLabel = getPositionLabel(entry.position);
  const period = formatCareerPeriod(entry.start_date, entry.end_date, entry.is_current);
  // Categoría y posición son opcionales en la base (dato viejo o carga
  // parcial); se omiten en vez de forzar un "—" por cada una, porque son
  // parte de una sola línea descriptiva y no de una grilla de campos fijos.
  const meta = [positionLabel, entry.category, period].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        {href ? (
          <Link
            href={href}
            className="font-medium text-zinc-900 hover:underline"
          >
            {entry.club_name}
          </Link>
        ) : (
          <span className="font-medium text-zinc-900">{entry.club_name}</span>
        )}
        {entry.is_current ? (
          <span className="inline-flex items-center rounded-full border border-brand-tint-border bg-brand-tint px-2 py-0.5 text-xs font-medium text-zinc-900">
            Actual
          </span>
        ) : null}
      </div>
      <p className="text-sm text-zinc-500">{meta}</p>
      {statsSlot ? <div className="flex flex-wrap gap-2 pt-1">{statsSlot}</div> : null}
    </div>
  );
}
