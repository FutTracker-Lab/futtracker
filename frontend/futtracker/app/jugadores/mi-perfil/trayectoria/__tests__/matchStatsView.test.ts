import { describe, expect, it } from "vitest";

import { groupMatchesByYear } from "@/app/jugadores/mi-perfil/trayectoria/matchStatsView";
import type { MatchStat } from "@/lib/data/stats";

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

describe("groupMatchesByYear", () => {
  it("solo incluye los años que tienen al menos un partido cargado", () => {
    const matches = [
      match({ match_date: "2026-03-01" }),
      match({ match_date: "2024-05-01" }),
    ];

    const groups = groupMatchesByYear(matches);

    expect(groups.map((g) => g.year)).toEqual([2026, 2024]);
  });

  it("ordena los grupos de año más reciente a más antiguo", () => {
    const matches = [
      match({ match_date: "2023-01-01" }),
      match({ match_date: "2025-01-01" }),
      match({ match_date: "2024-01-01" }),
    ];

    expect(groupMatchesByYear(matches).map((g) => g.year)).toEqual([2025, 2024, 2023]);
  });

  it("calcula el subtotal del año (partidos, minutos, goles, asistencias, tarjetas)", () => {
    const matches = [
      match({ match_date: "2025-04-12", goals: 1, assists: 1, minutes_played: 90 }),
      match({ match_date: "2025-04-05", goals: 0, assists: 0, minutes_played: 78, yellow_cards: 1 }),
    ];

    const [group] = groupMatchesByYear(matches);

    expect(group.totals).toEqual({
      matches: 2,
      minutes: 168,
      goals: 1,
      assists: 1,
      yellowCards: 1,
      redCards: 0,
    });
  });

  it("con una lista vacía, no devuelve ningún grupo", () => {
    expect(groupMatchesByYear([])).toEqual([]);
  });
});
