import Link from "next/link";

import type { CareerEntry } from "@/lib/data/careerEntries";
import { formatCareerPeriod } from "@/lib/format/dates";
import { RouteConstants } from "@/lib/routes";

type Props = {
  entries: CareerEntry[];
  activeEntryId: string;
};

/**
 * Selector de etapa para la pantalla de partidos. La entrada "Partidos
 * cargados" del sidebar aterriza en la etapa vigente, pero cargar un partido
 * viejo de un club donde ya no se juega es un caso normal —no un rincón— y
 * sin esto habría que volver a la trayectoria y entrar por el menú de la
 * fila. Acá se cambia de club sin salir de la pantalla.
 *
 * Links y no un <select> con JavaScript: son pocas etapas, se ve cuál está
 * activa de un vistazo y funciona igual sin JS, como el resto de la app.
 */
export default function CareerEntryPicker({ entries, activeEntryId }: Props) {
  if (entries.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Elegí la etapa" className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Etapa
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => {
          const active = entry.id === activeEntryId;

          return (
            <Link
              key={entry.id}
              href={RouteConstants.profile.careerMatches(entry.id)}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-md border border-brand-tint-border bg-brand-tint px-3 py-1.5 text-sm font-medium text-zinc-900"
                  : "rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }
            >
              {entry.club_name}
              <span className="ml-1.5 text-xs text-zinc-500">
                {formatCareerPeriod(
                  entry.start_date,
                  entry.end_date,
                  entry.is_current,
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
