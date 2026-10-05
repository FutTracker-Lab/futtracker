import type { SeasonStats } from "@/lib/data/stats";

type Props = {
  seasons: SeasonStats[];
};

/**
 * Resumen por año de una etapa puntual (requisito 8 de FUT-92). El diseño
 * (ScreenTrayectoria.jsx) lo muestra como un bloque por temporada: el año en
 * una caja aparte y al lado los valores abreviados — `2025 12 PJ 4 G 3 A` —
 * y no como una frase ("2025 · 12 partidos · 4 goles"). Las abreviaturas son
 * las del propio diseño: PJ partidos jugados, G goles, A asistencias.
 *
 * Se monta en el slot `renderStatsSlot` de `CareerTimeline` (T04d), tanto en
 * la trayectoria propia como en el timeline del perfil público — nunca
 * reescribe ese componente.
 *
 * Recibe ya filtradas las filas de `season_stats` de esta etapa: la consulta
 * (una por `player_id`, no por etapa) vive en la página que arma el árbol de
 * timeline, para no repetir un round-trip por cada fila del timeline.
 */
export default function SeasonSummaryBlock({ seasons }: Props) {
  // Una etapa sin partidos igual muestra su bloque, en cero. Devolver `null`
  // dejaba la fila sin nada y se leía como que la sección estaba rota, no
  // como que no hay nada cargado todavía.
  if (seasons.length === 0) {
    return (
      <div className="inline-flex items-stretch overflow-hidden rounded-md border border-zinc-200 text-xs">
        <span className="bg-zinc-100 px-2 py-1 font-medium text-zinc-500">
          Sin partidos
        </span>
        <span className="flex items-center gap-2 px-2 py-1 text-zinc-500">
          <span title="Partidos jugados">
            <strong className="font-semibold">0</strong> PJ
          </span>
          <span title="Goles">
            <strong className="font-semibold">0</strong> G
          </span>
          <span title="Asistencias">
            <strong className="font-semibold">0</strong> A
          </span>
        </span>
      </div>
    );
  }

  return (
    <>
      {seasons.map((season) => (
        <div
          key={season.season_year}
          className="inline-flex items-stretch overflow-hidden rounded-md border border-zinc-200 text-xs"
        >
          <span className="bg-zinc-100 px-2 py-1 font-semibold text-zinc-900">
            {season.season_year}
          </span>
          <span className="flex items-center gap-2 px-2 py-1 text-zinc-600">
            {/* `title` con el nombre completo: las abreviaturas del diseño no
                se entienden solas fuera de su contexto. */}
            <span title="Partidos jugados">
              <strong className="font-semibold text-zinc-900">
                {season.matches_played ?? 0}
              </strong>{" "}
              PJ
            </span>
            <span title="Goles">
              <strong className="font-semibold text-zinc-900">
                {season.goals ?? 0}
              </strong>{" "}
              G
            </span>
            <span title="Asistencias">
              <strong className="font-semibold text-zinc-900">
                {season.assists ?? 0}
              </strong>{" "}
              A
            </span>
          </span>
        </div>
      ))}
    </>
  );
}
