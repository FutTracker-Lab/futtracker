import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { getRecentMatches, type RecentMatch } from "@/lib/data/recentMatches";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "22222222-2222-4222-8222-222222222222";

const MATCH_ROW = {
  id: "1",
  opponent: "Club Atlético Provincial",
  career_entries: { club_name: "Rosario Central" },
} as RecentMatch;

// A diferencia del falso de `stats.test.ts`, la cadena se puede esperar desde
// cualquier punto: el test verifica qué se pide y no en qué orden se escribió.
// Así, pasar `.limit()` antes de `.order()` —la misma consulta— no lo rompe.
function fakeClient({
  data = [MATCH_ROW],
  error = null,
}: {
  data?: RecentMatch[] | null;
  error?: { code: string } | null;
} = {}) {
  const spies = {
    from: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  const builder = {
    select: () => builder,
    eq: (column: string, value: string) => {
      spies.eq(column, value);
      return builder;
    },
    order: (column: string, options: { ascending: boolean }) => {
      spies.order(column, options);
      return builder;
    },
    limit: (count: number) => {
      spies.limit(count);
      return builder;
    },
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve({ data, error }).then(resolve, reject),
  };

  const client = {
    from: (table: string) => {
      spies.from(table);
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("getRecentMatches", () => {
  // Se compara la lista completa de filtros, no solo que exista el de
  // jugador: así falla tanto si el filtro se reemplaza por uno de etapa como
  // si se le agrega uno encima. Con un filtro por `career_entry_id` el
  // perfil mostraría los partidos de un solo club en vez de los de toda la
  // carrera.
  it("filtra por player_id y por nada más", async () => {
    const { client, spies } = fakeClient();

    await expect(getRecentMatches(client, PLAYER_A)).resolves.toEqual([
      MATCH_ROW,
    ]);
    expect(spies.from).toHaveBeenCalledWith("match_stats");
    expect(spies.eq.mock.calls).toEqual([["player_id", PLAYER_A]]);
  });

  it("ordena del partido más reciente al más viejo", async () => {
    const { client, spies } = fakeClient();

    await getRecentMatches(client, PLAYER_A);

    expect(spies.order).toHaveBeenCalledWith("match_date", {
      ascending: false,
    });
  });

  it("trae 5 partidos si no se le pasa límite", async () => {
    const { client, spies } = fakeClient();

    await getRecentMatches(client, PLAYER_A);

    expect(spies.limit).toHaveBeenCalledWith(5);
  });

  it("respeta el límite que se le pasa", async () => {
    const { client, spies } = fakeClient();

    await getRecentMatches(client, PLAYER_A, 3);

    expect(spies.limit).toHaveBeenCalledWith(3);
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient({ data: null, error: { code: "42501" } });

    await expect(getRecentMatches(client, PLAYER_A)).rejects.toEqual({
      code: "42501",
    });
  });
});
