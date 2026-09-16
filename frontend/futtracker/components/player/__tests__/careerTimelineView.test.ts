import { describe, expect, it } from "vitest";

import {
  getClubHref,
  splitVisibleEntries,
  VISIBLE_ENTRIES_LIMIT,
} from "@/components/player/careerTimelineView";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";

function entry(overrides: Partial<CareerTimelineEntry> = {}): CareerTimelineEntry {
  return {
    id: "entry-id",
    player_id: "player-id",
    club_name: "Club de prueba",
    category: null,
    position: null,
    start_date: "2020-01-01",
    end_date: null,
    is_current: false,
    team_id: null,
    teams: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("splitVisibleEntries", () => {
  it("no colapsa nada con 5 entradas o menos", () => {
    const entries = Array.from({ length: 3 }, (_, i) => entry({ id: `${i}` }));

    const { visible, collapsed } = splitVisibleEntries(entries);

    expect(visible).toHaveLength(3);
    expect(collapsed).toHaveLength(0);
  });

  it("colapsa todo lo que exceda el límite de 5, con 8 entradas", () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry({ id: `${i}` }));

    const { visible, collapsed } = splitVisibleEntries(entries);

    expect(visible).toHaveLength(VISIBLE_ENTRIES_LIMIT);
    expect(collapsed).toHaveLength(3);
    // El orden ya lo garantiza la consulta (is_current desc, start_date
    // desc); el corte solo tiene que preservarlo, no reordenar.
    expect(visible.map((e) => e.id)).toEqual(["0", "1", "2", "3", "4"]);
    expect(collapsed.map((e) => e.id)).toEqual(["5", "6", "7"]);
  });
});

describe("getClubHref", () => {
  it("linkea a /equipos/<team_id> cuando la entrada tiene equipo vinculado", () => {
    const withTeam = entry({ team_id: "33333333-3333-4333-8333-333333333333" });

    expect(getClubHref(withTeam)).toBe(
      "/equipos/33333333-3333-4333-8333-333333333333",
    );
  });

  it("devuelve null (texto plano) cuando team_id es null", () => {
    expect(getClubHref(entry({ team_id: null }))).toBeNull();
  });
});
