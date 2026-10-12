import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  mapSearchPlayersError,
  searchPlayers,
  searchPlayersParamsSchema,
} from "@/lib/data/players";
import type { Database } from "@/lib/supabase/database.types";

const P1_ROW = {
  player_id: "f0000001-0000-4000-8000-000000000108",
  full_name: "Tomás Aguirre",
  avatar_path: null,
  position: "delantero",
  age: 25,
  city: "Pilar",
  province: "Buenos Aires",
  matches_played: 3,
  is_seeking_team: true,
  distance_km: 0,
  total_count: 3,
};

function fakeClient({
  data = [P1_ROW],
  error = null,
}: {
  data?: (typeof P1_ROW)[] | null;
  error?: { code: string; message: string } | null;
} = {}) {
  const rpc = vi.fn(async () => ({ data, error }));
  const client = { rpc } as unknown as SupabaseClient<Database>;

  return { client, rpc };
}

describe("searchPlayersParamsSchema", () => {
  it("completa los valores por defecto de la función", () => {
    expect(searchPlayersParamsSchema.parse({ radius: 50 })).toEqual({
      radius: 50,
      position: null,
      seekingOnly: true,
      limit: 20,
      offset: 0,
    });
  });

  // Los mismos bordes que valida la función: si se afloja uno de los dos
  // lados, estos casos lo marcan.
  it.each([
    ["radio 0", { radius: 0 }],
    ["radio 201", { radius: 201 }],
    ["radio con decimales", { radius: 10.5 }],
    ["posición que no existe", { radius: 50, position: "portero" }],
    ["límite 0", { radius: 50, limit: 0 }],
    ["límite 51", { radius: 50, limit: 51 }],
    ["offset negativo", { radius: 50, offset: -1 }],
  ])("rechaza %s", (_caso, params) => {
    expect(searchPlayersParamsSchema.safeParse(params).success).toBe(false);
  });

  it("acepta los bordes válidos", () => {
    expect(
      searchPlayersParamsSchema.safeParse({ radius: 1, limit: 1 }).success,
    ).toBe(true);
    expect(
      searchPlayersParamsSchema.safeParse({ radius: 200, limit: 50 }).success,
    ).toBe(true);
  });
});

describe("mapSearchPlayersError", () => {
  it("reconoce el equipo sin ubicación", () => {
    expect(
      mapSearchPlayersError({ code: "P0001", message: "search_origin_missing" }),
    ).toBe("origin_missing");
  });

  it("reconoce la cuenta que no es de delegado", () => {
    expect(
      mapSearchPlayersError({ code: "42501", message: "search_delegates_only" }),
    ).toBe("delegates_only");
  });

  // Un 42501 de permisos de la base no es "no sos delegado". Mapearlo así le
  // mostraría un 404 a un delegado de verdad y escondería el bug.
  it("no confunde un permiso que falta en la base con un no-delegado", () => {
    expect(
      mapSearchPlayersError({
        code: "42501",
        message: "permission denied for function haversine_km",
      }),
    ).toBeNull();
  });

  it.each([
    ["un parámetro inválido", { code: "22023", message: "invalid_radius" }],
    ["un error sin código", { message: "fetch failed" }],
    ["algo que no es un objeto", "boom"],
    ["null", null],
  ])("devuelve null para %s", (_caso, error) => {
    expect(mapSearchPlayersError(error)).toBeNull();
  });
});

describe("searchPlayers", () => {
  it("traduce los parámetros a los p_* de la función", async () => {
    const { client, rpc } = fakeClient();

    await searchPlayers(client, {
      radius: 50,
      position: "mediocampista",
      seekingOnly: false,
      limit: 10,
      offset: 20,
    });

    expect(rpc).toHaveBeenCalledWith("search_players", {
      p_radius_km: 50,
      p_position: "mediocampista",
      p_seeking_only: false,
      p_limit: 10,
      p_offset: 20,
    });
  });

  it("sin posición no manda p_position, para que la función use su default", async () => {
    const { client, rpc } = fakeClient();

    await searchPlayers(client, { radius: 50 });

    expect(rpc).toHaveBeenCalledWith("search_players", {
      p_radius_km: 50,
      p_seeking_only: true,
      p_limit: 20,
      p_offset: 0,
    });
  });

  it("devuelve las filas sin total_count y el total aparte", async () => {
    const { client } = fakeClient();

    const result = await searchPlayers(client, { radius: 50 });

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          player_id: P1_ROW.player_id,
          full_name: "Tomás Aguirre",
          avatar_path: null,
          position: "delantero",
          age: 25,
          city: "Pilar",
          province: "Buenos Aires",
          matches_played: 3,
          is_seeking_team: true,
          distance_km: 0,
        },
      ],
      total: 3,
    });
  });

  // La lista de campos es explícita: una columna nueva en la función no
  // llega sola a la pantalla.
  it("no deja pasar columnas que no están en la lista", async () => {
    const { client } = fakeClient({
      data: [{ ...P1_ROW, phone: "+54 9 11 0000-0000" } as typeof P1_ROW],
    });

    const result = await searchPlayers(client, { radius: 50 });

    expect(result.ok && result.rows[0]).not.toHaveProperty("phone");
  });

  it("con una página vacía el total es 0", async () => {
    const { client } = fakeClient({ data: [] });

    await expect(searchPlayers(client, { radius: 50, offset: 40 })).resolves.toEqual({
      ok: true,
      rows: [],
      total: 0,
    });
  });

  it("devuelve el equipo sin ubicación como falla esperable", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "P0001", message: "search_origin_missing" },
    });

    await expect(searchPlayers(client, { radius: 50 })).resolves.toEqual({
      ok: false,
      reason: "origin_missing",
    });
  });

  it("devuelve la cuenta que no es de delegado como falla esperable", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "42501", message: "search_delegates_only" },
    });

    await expect(searchPlayers(client, { radius: 50 })).resolves.toEqual({
      ok: false,
      reason: "delegates_only",
    });
  });

  it("lanza cualquier otro error, para que lo agarre el error.tsx", async () => {
    const error = { code: "57014", message: "canceling statement due to statement timeout" };
    const { client } = fakeClient({ data: null, error });

    await expect(searchPlayers(client, { radius: 50 })).rejects.toBe(error);
  });

  it("con un parámetro inválido lanza sin llamar a la base", async () => {
    const { client, rpc } = fakeClient();

    await expect(searchPlayers(client, { radius: 0 })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
