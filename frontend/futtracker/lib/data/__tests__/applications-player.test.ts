import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  ApplicationError,
  applicationErrorKey,
  applyToVacancy,
  listMyApplications,
  withdrawApplication,
} from "@/lib/data/applications";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_ID = "11111111-1111-4111-8111-111111111111";
const V1 = "0a000001-0000-4000-8000-000000000120";

// Mismo falso que `applications.test.ts` (Facu, FUT-129): una cadena que se
// puede esperar desde cualquier punto y registra cada llamada. Suma
// `auth.getUser`, porque estas funciones sacan el jugador de la sesión.
function fakeClient({
  result = { data: [], error: null },
  userId = PLAYER_ID,
}: {
  result?: { data: unknown; error: unknown };
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
  };

  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("applicationErrorKey", () => {
  it.each([
    ["postulación repetida", { code: "23505", message: "duplicate key" }, "alreadyApplied"],
    ["vacante cerrada", { code: "23514", message: "vacancy_closed" }, "vacancyClosed"],
    [
      "cuenta sin fila en players",
      {
        code: "23503",
        message:
          'insert or update on table "vacancy_applications" violates foreign key constraint "vacancy_applications_player_id_fkey"',
      },
      "profileIncomplete",
    ],
    ["postulación a nombre de otro", { code: "42501", message: "new row violates row-level security policy" }, "forbidden"],
    ["un error sin código", { message: "fetch failed" }, "unexpected"],
    ["algo que no es un objeto", "boom", "unexpected"],
  ])("%s → %s", (_caso, error, key) => {
    expect(applicationErrorKey(error)).toBe(key);
  });

  // Una vacante que no existe también da 23503, pero por la otra foránea.
  // Mandar al jugador a completar su perfil sería mandarlo a arreglar algo que
  // no está roto.
  it("una vacante inexistente no es perfil incompleto", () => {
    expect(
      applicationErrorKey({
        code: "23503",
        message:
          'insert or update on table "vacancy_applications" violates foreign key constraint "vacancy_applications_vacancy_id_fkey"',
      }),
    ).toBe("unexpected");
  });

  it("respeta la clave de un ApplicationError", () => {
    expect(applicationErrorKey(new ApplicationError("notFound"))).toBe("notFound");
  });
});

describe("applyToVacancy", () => {
  it("inserta a nombre del jugador de la sesión", async () => {
    const row = { id: "a1", vacancy_id: V1, player_id: PLAYER_ID, created_at: "2026-10-12T10:00:00Z" };
    const { client, calls } = fakeClient({ result: { data: row, error: null } });

    await expect(applyToVacancy(client, V1)).resolves.toEqual(row);
    expect(calls).toContainEqual({ method: "from", args: ["vacancy_applications"] });
    expect(calls).toContainEqual({
      method: "insert",
      args: [{ vacancy_id: V1, player_id: PLAYER_ID }],
    });
  });

  it("sin sesión falla como forbidden sin escribir", async () => {
    const { client, calls } = fakeClient({ userId: null });

    await expect(applyToVacancy(client, V1)).rejects.toMatchObject({ key: "forbidden" });
    expect(calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("propaga el error de la base para que lo traduzca quien llama", async () => {
    const error = { code: "23514", message: "vacancy_closed" };
    const { client } = fakeClient({ result: { data: null, error } });

    await expect(applyToVacancy(client, V1)).rejects.toBe(error);
  });
});

describe("withdrawApplication", () => {
  it("borra la postulación por id", async () => {
    const { client, calls } = fakeClient({ result: { data: [{ id: "a1" }], error: null } });

    await expect(withdrawApplication(client, "a1")).resolves.toBeUndefined();
    expect(calls).toContainEqual({ method: "delete", args: [] });
    expect(calls).toContainEqual({ method: "eq", args: ["id", "a1"] });
  });

  // La RLS no da error con una fila ajena: la filtra y el delete afecta 0.
  it("si no borró nada falla como notFound", async () => {
    const { client } = fakeClient({ result: { data: [], error: null } });

    await expect(withdrawApplication(client, "ajena")).rejects.toMatchObject({
      key: "notFound",
    });
  });

  it("propaga el error de la base", async () => {
    const error = { code: "PGRST000", message: "fetch failed" };
    const { client } = fakeClient({ result: { data: null, error } });

    await expect(withdrawApplication(client, "a1")).rejects.toBe(error);
  });
});

describe("listMyApplications", () => {
  const raw = {
    id: "a1",
    created_at: "2026-10-12T10:00:00Z",
    vacancies: {
      id: V1,
      position: "mediocampista",
      modality: "futbol_11",
      level: "competitivo",
      status: "closed",
      teams: { id: "e1", name: "Club Atlético Pilar", city: "Pilar", crest_path: null },
    },
  };

  it("arma la vacante con su equipo adentro", async () => {
    const { client } = fakeClient({ result: { data: [raw], error: null } });

    await expect(listMyApplications(client)).resolves.toEqual([
      {
        id: "a1",
        created_at: "2026-10-12T10:00:00Z",
        vacancy: {
          id: V1,
          position: "mediocampista",
          modality: "futbol_11",
          level: "competitivo",
          status: "closed",
          team: { id: "e1", name: "Club Atlético Pilar", city: "Pilar", crest_path: null },
        },
      },
    ]);
  });

  it("filtra por el jugador de la sesión, de la más nueva a la más vieja, hasta 50", async () => {
    const { client, calls } = fakeClient();

    await listMyApplications(client);

    expect(calls).toContainEqual({ method: "eq", args: ["player_id", PLAYER_ID] });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expect(calls).toContainEqual({ method: "limit", args: [50] });
  });

  it("sin sesión devuelve una lista vacía sin consultar", async () => {
    const { client, calls } = fakeClient({ userId: null });

    await expect(listMyApplications(client)).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it("propaga el error de la consulta", async () => {
    const error = { code: "PGRST000", message: "fetch failed" };
    const { client } = fakeClient({ result: { data: null, error } });

    await expect(listMyApplications(client)).rejects.toBe(error);
  });
});
