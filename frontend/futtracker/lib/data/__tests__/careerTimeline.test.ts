import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  getCareerTimelineEntries,
  type CareerTimelineEntry,
} from "@/lib/data/careerTimeline";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "11111111-1111-4111-8111-111111111111";

const ROWS = [
  {
    club_name: "Deportivo Palermo",
    is_current: true,
    team_id: "22222222-2222-4222-8222-222222222222",
    teams: { id: "22222222-2222-4222-8222-222222222222", name: "Deportivo Palermo", crest_path: null },
  },
  {
    club_name: "Atlético Flores",
    is_current: false,
    team_id: null,
    teams: null,
  },
] as CareerTimelineEntry[];

function fakeClient({
  data = [],
  error = null,
}: {
  data?: CareerTimelineEntry[];
  error?: { code: string } | null;
} = {}) {
  const spies = { from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn() };

  const client = {
    from(table: string) {
      spies.from(table);

      const chain = {
        select(columns: string) {
          spies.select(columns);

          return chain;
        },
        eq(column: string, value: string) {
          spies.eq(column, value);

          return chain;
        },
        order(column: string, { ascending }: { ascending: boolean }) {
          spies.order(column, ascending);

          return chain;
        },
        then(
          resolve: (result: {
            data: CareerTimelineEntry[] | null;
            error: { code: string } | null;
          }) => unknown,
        ) {
          return resolve(error ? { data: null, error } : { data, error: null });
        },
      };

      return chain;
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("getCareerTimelineEntries", () => {
  it("pide primero las entradas actuales y después por start_date descendente", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await getCareerTimelineEntries(client, PLAYER_A);

    expect(spies.order.mock.calls[0]).toEqual(["is_current", false]);
    expect(spies.order.mock.calls[1]).toEqual(["start_date", false]);
  });

  it("embebe el equipo linkeado en el mismo select", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await getCareerTimelineEntries(client, PLAYER_A);

    expect(spies.select).toHaveBeenCalledWith("*, teams(id, name, crest_path)");
  });

  it("consulta la tabla filtrando por el jugador", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await expect(getCareerTimelineEntries(client, PLAYER_A)).resolves.toEqual(
      ROWS,
    );
    expect(spies.from).toHaveBeenCalledWith("career_entries");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
  });

  it("devuelve un array vacío cuando el jugador no tiene entradas", async () => {
    const { client } = fakeClient();

    await expect(getCareerTimelineEntries(client, PLAYER_A)).resolves.toEqual(
      [],
    );
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient({ error: { code: "42501" } });

    await expect(getCareerTimelineEntries(client, PLAYER_A)).rejects.toEqual({
      code: "42501",
    });
  });
});
