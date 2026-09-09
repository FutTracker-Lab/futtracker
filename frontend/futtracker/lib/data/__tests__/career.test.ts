import { describe, expect, it, vi } from "vitest";

import { getCareerEntries, type CareerEntry } from "@/lib/data/career";
import { createClient } from "@/lib/supabase/server";

// El doble reemplaza nuestro módulo de servidor, no la librería de Supabase:
// el helper crea el cliente adentro.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const PLAYER_A = "11111111-1111-4111-8111-111111111111";
const PLAYER_B = "22222222-2222-4222-8222-222222222222";

const ROWS = [
  { player_id: PLAYER_A, club_name: "Fénix", is_current: true },
  { player_id: PLAYER_A, club_name: "Morón", is_current: false },
  { player_id: PLAYER_B, club_name: "Tiro Federal", is_current: true },
] as CareerEntry[];

function fakeClient({
  rows = [],
  error = null,
}: { rows?: CareerEntry[]; error?: { code: string } | null } = {}) {
  const spies = { from: vi.fn(), eq: vi.fn(), order: vi.fn() };

  const client = {
    from(table: string) {
      spies.from(table);

      let filtered = rows;

      const chain = {
        select: () => chain,
        eq(column: keyof CareerEntry, value: string) {
          spies.eq(column, value);
          filtered = filtered.filter((row) => row[column] === value);

          return chain;
        },
        order(
          column: keyof CareerEntry,
          { ascending }: { ascending: boolean },
        ) {
          spies.order(column, ascending);

          return chain;
        },
        then(
          resolve: (result: {
            data: CareerEntry[] | null;
            error: { code: string } | null;
          }) => unknown,
        ) {
          return resolve(
            error ? { data: null, error } : { data: filtered, error: null },
          );
        },
      };

      return chain;
    },
  };

  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  );

  return spies;
}

describe("getCareerEntries", () => {
  it("pide primero las entradas actuales", async () => {
    const spies = fakeClient({ rows: ROWS });

    await getCareerEntries(PLAYER_A);

    expect(spies.order.mock.calls[0]).toEqual(["is_current", false]);
  });

  it("después ordena por start_date descendente", async () => {
    const spies = fakeClient({ rows: ROWS });

    await getCareerEntries(PLAYER_A);

    expect(spies.order.mock.calls[1]).toEqual(["start_date", false]);
  });

  it("consulta la tabla filtrando por el jugador", async () => {
    const spies = fakeClient({ rows: ROWS });

    const entries = await getCareerEntries(PLAYER_A);

    expect(spies.from).toHaveBeenCalledWith("career_entries");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
    expect(entries.map((row) => row.club_name)).toEqual(["Fénix", "Morón"]);
  });

  it("devuelve un array vacío cuando el jugador no tiene entradas", async () => {
    fakeClient({ rows: [ROWS[2]] });

    await expect(getCareerEntries(PLAYER_A)).resolves.toEqual([]);
  });

  it("propaga el error de PostgREST", async () => {
    fakeClient({ error: { code: "42501" } });

    await expect(getCareerEntries(PLAYER_A)).rejects.toEqual({ code: "42501" });
  });
});
