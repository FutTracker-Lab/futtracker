import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createTeam,
  getCrestSignedUrl,
  getMyTeam,
  getTeamById,
  teamInputSchema,
  updateCrestPath,
  type Team,
  type TeamInput,
} from "@/lib/data/teams";
import type { Database } from "@/lib/supabase/database.types";

const TEAM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DELEGATE_A = "66666666-6666-4666-8666-666666666666";
const DELEGATE_B = "77777777-7777-4777-8777-777777777777";

const INPUT: TeamInput = {
  name: "Club Atlético Pilar",
  club_name: "Club Atlético Pilar",
  category: "Primera",
  league: "Liga de Pilar",
  city: "Pilar",
  province: "Buenos Aires",
  country: "AR",
  latitude: -34.4583,
  longitude: -58.9142,
  founded_year: 1954,
  bio: "Club de barrio con cancha propia",
  contact_email: "delegado@example.com",
};

const ROW = { id: TEAM_A, name: "Club Atlético Pilar" } as Team;

// Doble con las tres cadenas que usa el módulo. Que RLS deje o no pasar la
// escritura lo prueba `teams.rls.test.ts` contra la base de verdad.
function fakeClient({
  userId = null,
  data = null,
  error = null,
}: {
  userId?: string | null;
  data?: Team | null;
  error?: { code: string } | null;
} = {}) {
  const spies = {
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          spies.eq(column, value);

          return { maybeSingle: async () => ({ data, error }) };
        },
      }),
      insert: (row: unknown) => {
        spies.insert(row);

        return {
          select: () => ({ single: async () => ({ data, error }) }),
        };
      },
      update: (row: unknown) => {
        spies.update(row);

        return {
          eq: (column: string, value: string) => {
            spies.eq(column, value);

            return {
              select: () => ({ single: async () => ({ data, error }) }),
            };
          },
        };
      },
    }),
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("teamInputSchema", () => {
  it("acepta un input válido completo", () => {
    expect(teamInputSchema.parse(INPUT)).toEqual(INPUT);
  });

  // Los rangos duplican los `check` de la migración. Si alguien afloja uno de
  // los dos lados, estos casos lo marcan.
  it.each([
    ["name", "a"],
    ["name", "a".repeat(81)],
    ["founded_year", 1700],
    ["founded_year", 2200],
    ["contact_email", "delegado@"],
    ["latitude", 91],
    ["longitude", -181],
  ])("rechaza %s = %s", (field, value) => {
    const result = teamInputSchema.safeParse({ ...INPUT, [field]: value });

    expect(result.success).toBe(false);
  });
});

describe("createTeam", () => {
  it("escribe el input con el id de la sesión como owner", async () => {
    const { client, spies } = fakeClient({ userId: DELEGATE_A, data: ROW });

    await expect(createTeam(client, INPUT)).resolves.toEqual(ROW);
    expect(spies.insert).toHaveBeenCalledWith({
      owner_id: DELEGATE_A,
      ...INPUT,
    });
  });

  it("ignora el owner_id que venga en el input", async () => {
    const { client, spies } = fakeClient({ userId: DELEGATE_A, data: ROW });

    await createTeam(client, {
      ...INPUT,
      // @ts-expect-error a propósito: por la red puede llegar cualquier cosa.
      owner_id: DELEGATE_B,
    });

    expect(spies.insert).toHaveBeenCalledWith({
      owner_id: DELEGATE_A,
      ...INPUT,
    });
  });

  it("sin sesión no escribe", async () => {
    const { client, spies } = fakeClient();

    await expect(createTeam(client, INPUT)).rejects.toThrow(
      "No hay sesión iniciada",
    );
    expect(spies.insert).not.toHaveBeenCalled();
  });
});

describe("getMyTeam", () => {
  it("consulta por el owner_id de la sesión", async () => {
    const { client, spies } = fakeClient({ userId: DELEGATE_A, data: ROW });

    await expect(getMyTeam(client)).resolves.toEqual(ROW);
    expect(spies.eq).toHaveBeenCalledWith("owner_id", DELEGATE_A);
  });

  it("devuelve null sin sesión, sin consultar", async () => {
    const { client, spies } = fakeClient({ data: ROW });

    await expect(getMyTeam(client)).resolves.toBeNull();
    expect(spies.eq).not.toHaveBeenCalled();
  });
});

describe("getTeamById", () => {
  it("devuelve null cuando no hay equipo", async () => {
    const { client } = fakeClient();

    await expect(getTeamById(client, TEAM_A)).resolves.toBeNull();
  });
});

describe("updateCrestPath", () => {
  it.each([
    [`${DELEGATE_B}/escudo.png`],
    [`${TEAM_A}/../otro.png`],
  ])("rechaza el path %s, sin escribir", async (path) => {
    const { client, spies } = fakeClient({ userId: DELEGATE_A, data: ROW });

    await expect(updateCrestPath(client, TEAM_A, path)).rejects.toThrow(
      "El escudo no pertenece a este equipo",
    );
    expect(spies.update).not.toHaveBeenCalled();
  });
});

function fakeStorageClient() {
  const spy = vi.fn();

  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          spy(bucket, path, expiresIn);

          return { data: { signedUrl: "https://local/firmada" }, error: null };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spy };
}

describe("getCrestSignedUrl", () => {
  it("devuelve null sin escudo, sin ir a storage", async () => {
    const { client, spy } = fakeStorageClient();

    await expect(getCrestSignedUrl(client, null)).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
