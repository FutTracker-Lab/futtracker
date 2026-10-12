import { describe, expect, it } from "vitest";

import { groupSeasonTotalsByYear } from "@/components/player/seasonTotalsView";
import type { SeasonStats } from "@/lib/data/stats";

function season(overrides: Partial<SeasonStats>): SeasonStats {
  return {
    player_id: "player-1",
    career_entry_id: "entry-1",
    season_year: 2025,
    matches_played: 0,
    goals: 0,
    assists: 0,
    minutes_played: 0,
    yellow_cards: 0,
    red_cards: 0,
    clean_sheets: 0,
    matches_started: 0,
    ...overrides,
  };
}

describe("groupSeasonTotalsByYear", () => {
  it("junta en un solo año las filas de clubes distintos", () => {
    const seasons = [
      season({ career_entry_id: "entry-1", season_year: 2025, matches_played: 1, goals: 1 }),
      season({ career_entry_id: "entry-2", season_year: 2025, matches_played: 1, goals: 1 }),
    ];

    const totals = groupSeasonTotalsByYear(seasons);

    expect(totals).toHaveLength(1);
    expect(totals[0].year).toBe(2025);
    expect(totals[0].matchesPlayed).toBe(2);
    expect(totals[0].goals).toBe(2);
  });

  it("calcula los promedios por partido del año", () => {
    const seasons = [
      season({ season_year: 2026, matches_played: 4, goals: 2, assists: 3 }),
    ];

    const [totals] = groupSeasonTotalsByYear(seasons);

    expect(totals.assists).toBe(3);
    expect(totals.goalsPerMatch).toBe(0.5);
    expect(totals.assistsPerMatch).toBe(0.75);
  });

  // `getSeasonStats` entrega del más nuevo al más viejo; `SeasonMetrics` toma el último.
  it("ordena los años de más viejo a más nuevo", () => {
    const seasons = [
      season({ season_year: 2026, matches_played: 2, goals: 1, assists: 2 }),
      season({ season_year: 2025, matches_played: 3, goals: 4, assists: 1 }),
    ];

    const totals = groupSeasonTotalsByYear(seasons);

    expect(totals.map((t) => t.year)).toEqual([2025, 2026]);
    expect(totals.map((t) => t.goals)).toEqual([4, 1]);
    expect(totals.map((t) => t.assists)).toEqual([1, 2]);
  });

  it("no inventa un año sin partidos entre dos con partidos", () => {
    const seasons = [
      season({ season_year: 2024, matches_played: 3 }),
      season({ season_year: 2026, matches_played: 2 }),
    ];

    expect(groupSeasonTotalsByYear(seasons).map((t) => t.year)).toEqual([2024, 2026]);
  });

  it("con un solo año, devuelve una sola fila", () => {
    const seasons = [season({ season_year: 2025, matches_played: 3, goals: 4 })];

    expect(groupSeasonTotalsByYear(seasons)).toHaveLength(1);
  });

  it("con una lista vacía, no devuelve ningún año", () => {
    expect(groupSeasonTotalsByYear([])).toEqual([]);
  });

  // Los agregados de la vista vienen nullables en los tipos generados.
  it("trata las columnas en null como cero y no divide por cero", () => {
    const seasons = [
      season({ season_year: 2025, matches_played: null, goals: null, assists: null }),
    ];

    const [totals] = groupSeasonTotalsByYear(seasons);

    expect(totals.matchesPlayed).toBe(0);
    expect(totals.goalsPerMatch).toBe(0);
    expect(totals.assistsPerMatch).toBe(0);
  });

  it("descarta las filas sin año", () => {
    const seasons = [
      season({ season_year: null, matches_played: 5 }),
      season({ season_year: 2025, matches_played: 3 }),
    ];

    expect(groupSeasonTotalsByYear(seasons).map((t) => t.year)).toEqual([2025]);
  });
});
