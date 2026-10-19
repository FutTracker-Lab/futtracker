import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  FollowError,
  followErrorKey,
  followTeam,
  getFollowerCount,
  isFollowing,
  listFollowedTeams,
  listTeamFollowers,
  unfollowTeam,
} from "@/lib/data/follows";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_ID = "11111111-1111-4111-8111-111111111111";
const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Cadena que se puede esperar desde cualquier punto y registra cada llamada,
// como el falso de `applications.test.ts`. Suma `auth.getUser` y `rpc`, con
// un resultado por nombre de función.
function fakeClient({
  result = { data: [], error: null },
  rpc = {},
  userId = PLAYER_ID,
}: {
  result?: { data: unknown; error: unknown };
  rpc?: Record<string, { data: unknown; error: unknown }>;
  userId?: string | null;
} = {}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = new Proxy(
    {},
    {
      get(_, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => void) => resolve(result);
        }
        return (...args: unknown[]) => {
          calls.push({ method, args });
          return chain;
        };
      },
    },
  );
  const client = {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    from: (table: string) => (calls.push({ method: "from", args: [table] }), chain),
    rpc: async (name: string, args: unknown) => {
      calls.push({ method: "rpc", args: [name, args] });
      return rpc[name] ?? { data: null, error: null };
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("followErrorKey", () => {
  it.each([
    ["seguimiento repetido", { code: "23505", message: "duplicate key" }, "alreadyFollowing"],
    [
      "equipo inexistente",
      {
        code: "23503",
        message: 'insert or update on table "team_follows" violates foreign key constraint "team_follows_team_id_fkey"',
      },
      "teamNotFound",
    ],
    ["delegado o a nombre de otro", { code: "42501", message: "new row violates row-level security policy" }, "forbidden"],
    ["un error sin código", { message: "fetch failed" }, "unexpected"],
    ["algo que no es un objeto", "boom", "unexpected"],
  ])("%s → %s", (_caso, error, key) => {
    expect(followErrorKey(error)).toBe(key);
  });

  // La otra foránea apunta a `profiles`: si fallara, no es un equipo que falta.
  it("un 23503 de la foránea del seguidor no es equipo inexistente", () => {
    expect(
      followErrorKey({
        code: "23503",
        message: 'violates foreign key constraint "team_follows_follower_id_fkey"',
      }),
    ).toBe("unexpected");
  });

  it("respeta la clave de un FollowError", () => {
    expect(followErrorKey(new FollowError("forbidden"))).toBe("forbidden");
  });
});

describe("followTeam", () => {
  it("inserta a nombre del usuario de la sesión", async () => {
    const { client, calls } = fakeClient({ result: { data: null, error: null } });

    await followTeam(client, E1);

    expect(calls).toContainEqual({
      method: "insert",
      args: [{ follower_id: PLAYER_ID, team_id: E1 }],
    });
  });

  it("sin sesión falla como forbidden sin escribir", async () => {
    const { client, calls } = fakeClient({ userId: null });

    await expect(followTeam(client, E1)).rejects.toMatchObject({ key: "forbidden" });
    expect(calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("propaga el error de la base para que lo traduzca quien llama", async () => {
    const error = { code: "23505", message: "duplicate key" };
    const { client } = fakeClient({ result: { data: null, error } });

    await expect(followTeam(client, E1)).rejects.toBe(error);
  });
});

describe("unfollowTeam", () => {
  it("borra solo la fila propia de ese equipo", async () => {
    const { client, calls } = fakeClient({ result: { data: null, error: null } });

    await unfollowTeam(client, E1);

    expect(calls).toContainEqual({ method: "delete", args: [] });
    expect(calls).toContainEqual({ method: "eq", args: ["follower_id", PLAYER_ID] });
    expect(calls).toContainEqual({ method: "eq", args: ["team_id", E1] });
  });
});

describe("isFollowing", () => {
  it("true si hay fila", async () => {
    const { client } = fakeClient({ result: { data: { team_id: E1 }, error: null } });

    await expect(isFollowing(client, E1)).resolves.toBe(true);
  });

  it("false si no hay fila", async () => {
    const { client } = fakeClient({ result: { data: null, error: null } });

    await expect(isFollowing(client, E1)).resolves.toBe(false);
  });

  it("sin sesión es false sin consultar", async () => {
    const { client, calls } = fakeClient({ userId: null });

    await expect(isFollowing(client, E1)).resolves.toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("getFollowerCount", () => {
  it("devuelve el número de la función team_follower_count", async () => {
    const { client, calls } = fakeClient({
      rpc: { team_follower_count: { data: 2, error: null } },
    });

    await expect(getFollowerCount(client, E1)).resolves.toBe(2);
    expect(calls).toContainEqual({
      method: "rpc",
      args: ["team_follower_count", { p_team_id: E1 }],
    });
  });
});

describe("listFollowedTeams", () => {
  it("devuelve los equipos que sigue, del más reciente al más viejo", async () => {
    const team = {
      id: E1,
      name: "Club Atlético Pilar",
      city: "Pilar",
      province: "Buenos Aires",
      category: "Primera",
      crest_path: null,
    };
    const { client, calls } = fakeClient({
      result: { data: [{ created_at: "2026-10-12T10:00:00Z", teams: team }], error: null },
    });

    await expect(listFollowedTeams(client)).resolves.toEqual([team]);
    expect(calls).toContainEqual({ method: "eq", args: ["follower_id", PLAYER_ID] });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
  });
});

describe("listTeamFollowers", () => {
  const row = (players: { position: string | null; city: string | null } | null) => ({
    follower_id: PLAYER_ID,
    created_at: "2026-10-12T10:00:00Z",
    profiles: { full_name: "Lucía Fernández", avatar_path: null, players },
  });

  it("al dueño le devuelve los seguidores con los datos del jugador", async () => {
    const { client } = fakeClient({
      result: { data: [row({ position: "delantero", city: "Pilar" })], error: null },
      rpc: { is_team_owner: { data: true, error: null } },
    });

    await expect(listTeamFollowers(client, E1)).resolves.toEqual([
      {
        follower_id: PLAYER_ID,
        full_name: "Lucía Fernández",
        avatar_path: null,
        position: "delantero",
        city: "Pilar",
        created_at: "2026-10-12T10:00:00Z",
      },
    ]);
  });

  it("un seguidor sin ficha de jugador sale con posición y ciudad en null", async () => {
    const { client } = fakeClient({
      result: { data: [row(null)], error: null },
      rpc: { is_team_owner: { data: true, error: null } },
    });

    const [follower] = await listTeamFollowers(client, E1);

    expect(follower.position).toBeNull();
    expect(follower.city).toBeNull();
  });

  // La RLS también le muestra a cada seguidor su propia fila: sin este chequeo,
  // un jugador se vería en la lista de seguidores de un equipo que sigue.
  it("a quien no es el dueño no le devuelve nada, aunque la RLS le muestre su fila", async () => {
    const { client } = fakeClient({
      result: { data: [row({ position: "delantero", city: "Pilar" })], error: null },
      rpc: { is_team_owner: { data: false, error: null } },
    });

    await expect(listTeamFollowers(client, E1)).resolves.toEqual([]);
  });
});
