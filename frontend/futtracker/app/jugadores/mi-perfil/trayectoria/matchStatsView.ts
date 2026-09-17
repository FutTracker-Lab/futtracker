import type { MatchStat } from "@/lib/data/stats";

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

function sumBy(matches: MatchStat[], pick: (match: MatchStat) => number): number {
  return matches.reduce((total, match) => total + pick(match), 0);
}

/**
 * Solo aparecen los años con al menos un partido cargado (requisito 3,
 * decisión 1.5: los huecos son válidos y no se señalan). Se asume que
 * `matches` ya viene ordenado por `match_date desc` (así lo entrega
 * `getMatchStats`); dentro de cada grupo se conserva ese orden.
 */
export function groupMatchesByYear(matches: MatchStat[]): YearGroup[] {
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

  return Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, yearMatches]) => ({
      year,
      matches: yearMatches,
      totals: {
        matches: yearMatches.length,
        minutes: sumBy(yearMatches, (m) => m.minutes_played),
        goals: sumBy(yearMatches, (m) => m.goals),
        assists: sumBy(yearMatches, (m) => m.assists),
        yellowCards: sumBy(yearMatches, (m) => m.yellow_cards),
        redCards: sumBy(yearMatches, (m) => m.red_cards),
      },
    }));
}
