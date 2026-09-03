import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  getAvatarSignedUrl,
  getMyPlayer,
  getPlayerById,
  playerInputSchema,
  upsertPlayer,
  type Player,
  type PlayerInput,
} from "@/lib/data/players";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "11111111-1111-4111-8111-111111111111";

const INPUT: PlayerInput = {
  birth_date: "1999-03-14",
  position: "delantero",
  preferred_foot: "derecha",
  height_cm: 168,
  weight_kg: 62,
  city: "Pilar",
  province: "Buenos Aires",
  country: "AR",
  latitude: -34.4583,
  longitude: -58.9142,
  bio: "Nueve de área",
  phone: "+54 9 11 4000-0001",
  is_seeking_team: true,
};

const ROW = { id: PLAYER_A, city: "Pilar" } as Player;

// Doble con las dos cadenas que usa el módulo. Que RLS deje o no pasar la
// escritura lo prueba `players.rls.test.ts` contra la base de verdad.
function fakeClient({
  userId = null,
  data = null,
  error = null,
}: {
  userId?: string | null;
  data?: Player | null;
  error?: { code: string } | null;
} = {}) {
  const spies = {
    eq: vi.fn(),
    upsert: vi.fn(),
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
      upsert: (row: unknown) => {
        spies.upsert(row);

        return {
          select: () => ({ single: async () => ({ data, error }) }),
        };
      },
    }),
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("getPlayerById", () => {
  it("devuelve la ficha", async () => {
    const { client, spies } = fakeClient({ data: ROW });

    await expect(getPlayerById(client, PLAYER_A)).resolves.toEqual(ROW);
    expect(spies.eq).toHaveBeenCalledWith("id", PLAYER_A);
  });

  it("devuelve null cuando no hay ficha", async () => {
    const { client } = fakeClient();

    await expect(getPlayerById(client, PLAYER_A)).resolves.toBeNull();
  });

  it("propaga el error de PostgREST", async () => {
    const { client } = fakeClient({ error: { code: "42501" } });

    await expect(getPlayerById(client, PLAYER_A)).rejects.toEqual({
      code: "42501",
    });
  });
});

describe("getMyPlayer", () => {
  it("consulta por el id de la sesión", async () => {
    const { client, spies } = fakeClient({ userId: PLAYER_A, data: ROW });

    await expect(getMyPlayer(client)).resolves.toEqual(ROW);
    expect(spies.eq).toHaveBeenCalledWith("id", PLAYER_A);
  });

  it("devuelve null sin sesión, sin consultar", async () => {
    const { client, spies } = fakeClient({ data: ROW });

    await expect(getMyPlayer(client)).resolves.toBeNull();
    expect(spies.eq).not.toHaveBeenCalled();
  });
});

describe("upsertPlayer", () => {
  it("escribe el input con el id de la sesión", async () => {
    const { client, spies } = fakeClient({ userId: PLAYER_A, data: ROW });

    await expect(upsertPlayer(client, INPUT)).resolves.toEqual(ROW);
    expect(spies.upsert).toHaveBeenCalledWith({ id: PLAYER_A, ...INPUT });
  });

  it("ignora las claves que no son columnas", async () => {
    const { client, spies } = fakeClient({ userId: PLAYER_A, data: ROW });

    await upsertPlayer(client, {
      ...INPUT,
      // @ts-expect-error a propósito: por la red puede llegar cualquier cosa.
      role: "delegate",
    });

    expect(spies.upsert).toHaveBeenCalledWith({ id: PLAYER_A, ...INPUT });
  });

  it("sin sesión no escribe", async () => {
    const { client, spies } = fakeClient();

    await expect(upsertPlayer(client, INPUT)).rejects.toThrow(
      "No hay sesión iniciada",
    );
    expect(spies.upsert).not.toHaveBeenCalled();
  });

  /**
   * El tipo del parámetro no sobrevive a la red: a este módulo lo llaman Server
   * Actions, que son endpoints públicos. La validación de acá es la que corta.
   */
  it("rechaza una altura fuera del rango del check, sin escribir", async () => {
    const { client, spies } = fakeClient({ userId: PLAYER_A });

    await expect(
      upsertPlayer(client, { ...INPUT, height_cm: 300 }),
    ).rejects.toThrow();
    expect(spies.upsert).not.toHaveBeenCalled();
  });

  it("rechaza una posición que no existe, sin escribir", async () => {
    const { client, spies } = fakeClient({ userId: PLAYER_A });

    await expect(
      // @ts-expect-error a propósito: el tipo lo rechaza y el runtime también
      // tiene que rechazarlo.
      upsertPlayer(client, { ...INPUT, position: "arbitro" }),
    ).rejects.toThrow();
    expect(spies.upsert).not.toHaveBeenCalled();
  });
});

function fakeStorageClient({
  error = null,
}: { error?: { message: string } | null } = {}) {
  const spy = vi.fn();

  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          spy(bucket, path, expiresIn);

          return {
            data: error ? null : { signedUrl: "https://local/firmada" },
            error,
          };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spy };
}

describe("getAvatarSignedUrl", () => {
  it("firma el path del bucket privado con TTL de 24 horas", async () => {
    const { client, spy } = fakeStorageClient();

    await expect(
      getAvatarSignedUrl(client, `${PLAYER_A}/avatar.png`),
    ).resolves.toBe("https://local/firmada");
    expect(spy).toHaveBeenCalledWith(
      "avatars",
      `${PLAYER_A}/avatar.png`,
      86400,
    );
  });

  it("devuelve null sin avatar, sin ir a storage", async () => {
    const { client, spy } = fakeStorageClient();

    await expect(getAvatarSignedUrl(client, null)).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("propaga el error de storage", async () => {
    const { client } = fakeStorageClient({
      error: { message: "Object not found" },
    });

    await expect(
      getAvatarSignedUrl(client, `${PLAYER_A}/avatar.png`),
    ).rejects.toEqual({ message: "Object not found" });
  });
});

describe("playerInputSchema", () => {
  it("acepta los campos opcionales en null", () => {
    const empty = {
      birth_date: null,
      position: null,
      preferred_foot: null,
      height_cm: null,
      weight_kg: null,
      city: null,
      province: null,
      country: null,
      latitude: null,
      longitude: null,
      bio: null,
      phone: null,
      is_seeking_team: true,
    };

    expect(playerInputSchema.parse(empty)).toEqual(empty);
  });

  // Los rangos duplican los `check` de la migración. Si alguien afloja uno de
  // los dos lados, estos casos lo marcan.
  it.each([
    ["height_cm", 99],
    ["height_cm", 251],
    ["weight_kg", 29],
    ["weight_kg", 201],
    ["latitude", -91],
    ["longitude", 181],
  ])("rechaza %s = %s", (field, value) => {
    const result = playerInputSchema.safeParse({ ...INPUT, [field]: value });

    expect(result.success).toBe(false);
  });

  it("rechaza una bio de más de 1000 caracteres", () => {
    const result = playerInputSchema.safeParse({
      ...INPUT,
      bio: "a".repeat(1001),
    });

    expect(result.success).toBe(false);
  });
});
