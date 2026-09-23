import type { MatchStat, SeasonStats } from "@/lib/data/stats";

/**
 * Agrupación por año de los partidos de una entrada (requisito 3 de FUT-92).
 * Separado en una función pura, sin renderizar nada, por el mismo motivo que
 * `splitVisibleEntries` de `careerTimelineView.ts`: el repo no tiene
 * testing-library/jsdom, así que esta lógica se prueba acá.
 */

export type YearGroup = {
  year: number;
  matches: MatchStat[];
  totals: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
};

// El año sale de `match_date` (string `YYYY-MM-DD`), nunca de un campo de
// temporada — no existe ninguno (requisito 4).
function yearOf(match: MatchStat): number {
  return Number(match.match_date.slice(0, 4));
}

/**
 * Solo aparecen los años con al menos un partido cargado (requisito 3,
 * decisión 1.5: los huecos son válidos y no se señalan). Se asume que
 * `matches` ya viene ordenado por `match_date desc` (así lo entrega
 * `getMatchStats`); dentro de cada grupo se conserva ese orden.
 *
 * `matches` y `seasons` son los de una sola etapa: los dos lectores filtran por
 * `career_entry_id`, así que acá no puede haber dos filas del mismo año.
 */
export function groupMatchesByYear(
  matches: MatchStat[],
  seasons: SeasonStats[],
): YearGroup[] {
  const byYear = new Map<number, MatchStat[]>();

  for (const match of matches) {
    const year = yearOf(match);
    const group = byYear.get(year);
    if (group) {
      group.push(match);
    } else {
      byYear.set(year, [match]);
    }
  }

  const seasonByYear = new Map(
    seasons.map((season) => [season.season_year, season]),
  );

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, yearMatches]) => {
      const season = seasonByYear.get(year);

      return {
        year,
        matches: yearMatches,
        totals: {
          // Cuenta las filas que la tabla muestra, no `matches_played`: el
          // badge tiene que describir lo que el jugador está viendo.
          matches: yearMatches.length,
          // El cero no reconstruye el total sumando: un subtotal que falta se
          // ve en vez de quedar tapado.
          minutes: season?.minutes_played ?? 0,
          goals: season?.goals ?? 0,
          assists: season?.assists ?? 0,
          yellowCards: season?.yellow_cards ?? 0,
          redCards: season?.red_cards ?? 0,
        },
      };
    });
}
