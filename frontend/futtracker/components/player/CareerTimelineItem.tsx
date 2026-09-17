import Link from "next/link";
import type { ReactNode } from "react";

import {
  getClubHref,
  getPositionAbbreviation,
} from "@/components/player/careerTimelineView";
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
  const abbreviation = getPositionAbbreviation(entry.position);
  const period = formatCareerPeriod(
    entry.start_date,
    entry.end_date,
    entry.is_current,
  );
  // Categoría es opcional en la base (dato viejo o carga parcial); se omite
  // en vez de forzar un "—", porque es parte de una línea descriptiva y no
  // de una grilla de campos fijos.
  const meta = [entry.category, period].filter(Boolean).join(" · ");

  return (
    <div className="flex gap-3 border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
      {/* Marcador de la línea de tiempo: relleno en la etapa actual y hueco
          en las cerradas, como en el diseño. Decorativo — el badge "Actual"
          es lo que comunica el estado a un lector de pantalla. */}
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
          entry.is_current
            ? "bg-brand ring-2 ring-brand-tint-border"
            : "border border-zinc-300 bg-white"
        }`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link
              href={href}
              className="font-semibold text-zinc-900 hover:underline"
            >
              {entry.club_name}
            </Link>
          ) : (
            <span className="font-semibold text-zinc-900">
              {entry.club_name}
            </span>
          )}
          {entry.is_current ? (
            <span className="inline-flex items-center rounded-full border border-brand-tint-border bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand">
              Actual
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {abbreviation ? (
            // `title` con el nombre completo: la abreviatura sola no se
            // entiende fuera del contexto del diseño.
            <span
              title={getPositionLabel(entry.position) ?? undefined}
              className="inline-flex shrink-0 items-center rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-brand-foreground"
            >
              {abbreviation}
            </span>
          ) : null}
          <p className="text-sm text-zinc-500">{meta}</p>
        </div>

        {statsSlot ? (
          <div className="flex flex-wrap gap-2 pt-0.5">{statsSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
