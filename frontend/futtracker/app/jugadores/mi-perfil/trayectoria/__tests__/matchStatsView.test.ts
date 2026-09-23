import { describe, expect, it } from "vitest";

import { groupMatchesByYear } from "@/app/jugadores/mi-perfil/trayectoria/matchStatsView";
import type { MatchStat, SeasonStats } from "@/lib/data/stats";

function match(overrides: Partial<MatchStat>): MatchStat {
  return {
    id: crypto.randomUUID(),
    career_entry_id: "entry-1",
    player_id: "player-1",
    match_date: "2025-01-01",
    opponent: "Rival",
    competition: null,
    started: true,
    minutes_played: 90,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    clean_sheet: false,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

function season(overrides: Partial<SeasonStats>): SeasonStats {
  return {
    player_id: "player-1",
    career_entry_id: "entry-1",
    season_year: 2025,
    matches_played: 0,
    matches_started: 0,
    minutes_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    clean_sheets: 0,
    ...overrides,
  };
}

describe("groupMatchesByYear", () => {
  it("solo incluye los años que tienen al menos un partido cargado", () => {
    const matches = [
      match({ match_date: "2026-03-01" }),
      match({ match_date: "2024-05-01" }),
    ];

    const groups = groupMatchesByYear(matches, []);

    expect(groups.map((g) => g.year)).toEqual([2026, 2024]);
  });

  it("ordena los grupos de año más reciente a más antiguo", () => {
    const matches = [
      match({ match_date: "2023-01-01" }),
      match({ match_date: "2025-01-01" }),
      match({ match_date: "2024-01-01" }),
    ];

    expect(groupMatchesByYear(matches, []).map((g) => g.year)).toEqual([
      2025, 2024, 2023,
    ]);
  });

  it("toma el subtotal del año de season_stats y no de sumar los partidos", () => {
    const matches = [
      match({ match_date: "2025-04-12", goals: 1, assists: 1, minutes_played: 90 }),
      match({ match_date: "2025-04-05", goals: 0, assists: 0, minutes_played: 78, yellow_cards: 1 }),
    ];
    const seasons = [
      season({
        season_year: 2025,
        minutes_played: 200,
        goals: 5,
        assists: 3,
        yellow_cards: 2,
        red_cards: 1,
      }),
    ];

    const [group] = groupMatchesByYear(matches, seasons);

    expect(group.totals).toEqual({
      matches: 2,
      minutes: 200,
      goals: 5,
      assists: 3,
      yellowCards: 2,
      redCards: 1,
    });
  });

  it("con un año sin fila en season_stats, deja el subtotal en cero y no lo recalcula", () => {
    const matches = [
      match({ match_date: "2024-06-01", goals: 2, assists: 1, minutes_played: 90 }),
    ];

    const [group] = groupMatchesByYear(matches, [
      season({ season_year: 2025, goals: 7 }),
    ]);

    expect(group.year).toBe(2024);
    expect(group.totals).toEqual({
      matches: 1,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    });
  });

  it("con una lista vacía, no devuelve ningún grupo", () => {
    expect(groupMatchesByYear([], [])).toEqual([]);
  });
});
