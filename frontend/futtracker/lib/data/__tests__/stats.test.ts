import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  getCareerTotals,
  getMatchStats,
  getSeasonStats,
  matchStatInputSchema,
  type MatchStat,
  type MatchStatInput,
  type PlayerCareerTotals,
  type SeasonStats,
} from "@/lib/data/stats";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "22222222-2222-4222-8222-222222222222";
const CAREER_ENTRY_A = "dc3aeea7-4ec1-44d4-b9b6-74511f579335";

const INPUT: MatchStatInput = {
  career_entry_id: CAREER_ENTRY_A,
  match_date: "2024-03-10",
  opponent: "Club Atlético Provincial",
  competition: "Liga Rosarina",
  started: true,
  minutes_played: 90,
  goals: 0,
  assists: 0,
  yellow_cards: 0,
  red_cards: 0,
  clean_sheet: true,
};

const MATCH_ROW = { id: "1", opponent: "Club Atlético Provincial" } as MatchStat;
const SEASON_ROW = { player_id: PLAYER_A, season_year: 2024 } as SeasonStats;
const TOTALS_ROW = { player_id: PLAYER_A, total_matches: 7 } as PlayerCareerTotals;

// Doble con las dos cadenas que usa el módulo. Que RLS y los triggers dejen o
// no pasar la escritura lo prueba `match_stats.rls.test.ts` contra la base.
function fakeClient<T>({
  data = null,
  error = null,
}: {
  data?: T | T[] | null;
  error?: { code: string } | null;
} = {}) {
  const spies = {
    from: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  const client = {
    from: (table: string) => {
      spies.from(table);

      return {
        select: () => ({
          eq: (column: string, value: string) => {
            spies.eq(column, value);

            return {
              order: (column: string, options: { ascending: boolean }) => {
                spies.order(column, options);

                return Promise.resolve({ data, error });
              },
              maybeSingle: async () => ({ data, error }),
            };
          },
        }),
      };
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("matchStatInputSchema", () => {
  it("acepta un input válido completo", () => {
    expect(matchStatInputSchema.parse(INPUT)).toEqual(INPUT);
  });

  // Los rangos duplican los `check` de la migración. Si alguien afloja uno de
  // los dos lados, estos casos lo marcan.
  it.each([
    ["opponent", "a"],
    ["opponent", "a".repeat(81)],
    ["minutes_played", -1],
    ["minutes_played", 200],
    ["minutes_played", 90.5],
    ["goals", 21],
    ["assists", 21],
    ["yellow_cards", 3],
    ["red_cards", 2],
    ["match_date", "10/03/2024"],
    ["career_entry_id", "no-es-uuid"],
  ])("rechaza %s = %s", (field, value) => {
    const result = matchStatInputSchema.safeParse({ ...INPUT, [field]: value });

    expect(result.success).toBe(false);
  });
});

describe("getMatchStats", () => {
  it("consulta por career_entry_id y ordena por fecha descendente", async () => {
    const { client, spies } = fakeClient<MatchStat>({ data: [MATCH_ROW] });

    await expect(getMatchStats(client, CAREER_ENTRY_A)).resolves.toEqual([
      MATCH_ROW,
    ]);
    expect(spies.from).toHaveBeenCalledWith("match_stats");
    expect(spies.eq).toHaveBeenCalledWith("career_entry_id", CAREER_ENTRY_A);
    expect(spies.order).toHaveBeenCalledWith("match_date", {
      ascending: false,
    });
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient<MatchStat>({ error: { code: "42501" } });

    await expect(getMatchStats(client, CAREER_ENTRY_A)).rejects.toEqual({
      code: "42501",
    });
  });
});

describe("getSeasonStats", () => {
  it("consulta la vista por player_id y ordena por año descendente", async () => {
    const { client, spies } = fakeClient<SeasonStats>({ data: [SEASON_ROW] });

    await expect(getSeasonStats(client, PLAYER_A)).resolves.toEqual([
      SEASON_ROW,
    ]);
    expect(spies.from).toHaveBeenCalledWith("season_stats");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
    expect(spies.order).toHaveBeenCalledWith("season_year", {
      ascending: false,
    });
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient<SeasonStats>({ error: { code: "42501" } });

    await expect(getSeasonStats(client, PLAYER_A)).rejects.toEqual({
      code: "42501",
    });
  });
});

describe("getCareerTotals", () => {
  it("consulta la vista por player_id", async () => {
    const { client, spies } = fakeClient<PlayerCareerTotals>({
      data: TOTALS_ROW,
    });

    await expect(getCareerTotals(client, PLAYER_A)).resolves.toEqual(
      TOTALS_ROW,
    );
    expect(spies.from).toHaveBeenCalledWith("player_career_totals");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
  });

  // Un jugador sin partidos no tiene fila en la vista.
  it("devuelve null cuando el jugador no tiene partidos", async () => {
    const { client } = fakeClient<PlayerCareerTotals>();

    await expect(getCareerTotals(client, PLAYER_A)).resolves.toBeNull();
  });
});
