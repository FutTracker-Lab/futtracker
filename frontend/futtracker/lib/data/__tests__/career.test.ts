import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { getCareerEntries, type CareerEntry } from "@/lib/data/career";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "11111111-1111-4111-8111-111111111111";

const ROWS = [
  { club_name: "Fénix", is_current: true },
  { club_name: "Morón", is_current: false },
] as CareerEntry[];

function fakeClient({
  data = [],
  error = null,
}: { data?: CareerEntry[]; error?: { code: string } | null } = {}) {
  const spies = { from: vi.fn(), eq: vi.fn(), order: vi.fn() };

  const client = {
    from(table: string) {
      spies.from(table);

      const chain = {
        select: () => chain,
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
            data: CareerEntry[] | null;
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

describe("getCareerEntries", () => {
  it("pide primero las entradas actuales", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await getCareerEntries(client, PLAYER_A);

    expect(spies.order.mock.calls[0]).toEqual(["is_current", false]);
  });

  it("después ordena por start_date descendente", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await getCareerEntries(client, PLAYER_A);

    expect(spies.order.mock.calls[1]).toEqual(["start_date", false]);
  });

  it("consulta la tabla filtrando por el jugador", async () => {
    const { client, spies } = fakeClient({ data: ROWS });

    await expect(getCareerEntries(client, PLAYER_A)).resolves.toEqual(ROWS);
    expect(spies.from).toHaveBeenCalledWith("career_entries");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
  });

  it("devuelve un array vacío cuando el jugador no tiene entradas", async () => {
    const { client } = fakeClient();

    await expect(getCareerEntries(client, PLAYER_A)).resolves.toEqual([]);
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient({ error: { code: "42501" } });

    await expect(getCareerEntries(client, PLAYER_A)).rejects.toEqual({
      code: "42501",
    });
  });
});
