import type { SeasonStats } from "@/lib/data/stats";

export type SeasonTotals = {
  year: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
};

type YearSums = Omit<SeasonTotals, "goalsPerMatch" | "assistsPerMatch">;

function perMatch(total: number, matchesPlayed: number): number {
  return matchesPlayed === 0 ? 0 : total / matchesPlayed;
}

// Deuda de FUT-106: debería leerse de `player_season_totals`, que no existe.
export function groupSeasonTotalsByYear(seasons: SeasonStats[]): SeasonTotals[] {
  const byYear = new Map<number, YearSums>();

  for (const season of seasons) {
    const year = season.season_year;
    if (year === null) continue;

    const sums = byYear.get(year) ?? { year, matchesPlayed: 0, goals: 0, assists: 0 };

    sums.matchesPlayed += season.matches_played ?? 0;
    sums.goals += season.goals ?? 0;
    sums.assists += season.assists ?? 0;

    byYear.set(year, sums);
  }

  // Promedio sobre el año completo: promediar los de cada club da otro número.
  return Array.from(byYear.values())
    .sort((a, b) => a.year - b.year)
    .map((sums) => ({
      ...sums,
      goalsPerMatch: perMatch(sums.goals, sums.matchesPlayed),
      assistsPerMatch: perMatch(sums.assists, sums.matchesPlayed),
    }));
}
