import Link from "next/link";

import type { RecentMatch } from "@/lib/data/recentMatches";
import { formatDayMonthYear } from "@/lib/format/dates";

type Props = {
  matches: RecentMatch[];
  isOwner: boolean;
  // A dónde lleva "Ver todos". Solo lo tiene el dueño: la gestión de
  // partidos es suya.
  allHref?: string;
};

/**
 * "Últimos partidos" del diseño.
 *
 * El diseño muestra por fila el marcador (`2 – 1`) y una valoración (`7,9`).
 * Ninguno de los dos existe: `match_stats` guarda el rendimiento del jugador
 * y no el resultado del equipo —T06a lo excluye explícitamente— y no hay
 * ninguna tabla de valoraciones. La fila muestra lo que sí hay: rival, club,
 * minutos, goles y asistencias.
 */
export default function RecentMatchesCard({ matches, isOwner, allHref }: Props) {
  return (
    <section
      aria-labelledby="ultimos-partidos-heading"
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2
            id="ultimos-partidos-heading"
            className="text-lg font-semibold text-zinc-900"
          >
            Últimos partidos
          </h2>
          <p className="text-sm text-zinc-500">
            Lo último que cargaste, de todos tus clubes.
          </p>
        </div>
        {allHref && matches.length > 0 ? (
          <Link
            href={allHref}
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Ver todos
          </Link>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {isOwner
            ? "Todavía no cargaste partidos. Cada uno suma a tus totales de carrera."
            : "Este jugador todavía no cargó partidos."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {matches.map((match) => (
            <li
              key={match.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-zinc-100 py-2.5 last:border-0"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-zinc-900">
                  {match.opponent}
                </span>
                <span className="truncate text-xs text-zinc-500">
                  {[match.career_entries?.club_name, match.competition]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span title="Minutos jugados">
                  <strong className="font-semibold text-zinc-900">
                    {match.minutes_played}
                  </strong>{" "}
                  MIN
                </span>
                <span title="Goles">
                  <strong className="font-semibold text-zinc-900">
                    {match.goals}
                  </strong>{" "}
                  G
                </span>
                <span title="Asistencias">
                  <strong className="font-semibold text-zinc-900">
                    {match.assists}
                  </strong>{" "}
                  A
                </span>
                <span className="w-24 text-right text-zinc-400">
                  {formatDayMonthYear(match.match_date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
