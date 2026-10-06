import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { searchPlayers, type PlayerSearchRow } from "@/lib/data/playerSearch";
import type { Database } from "@/lib/supabase/database.types";

const PARAMS = {
  radius: 50,
  position: null,
  seekingOnly: true,
  limit: 20,
  offset: 0,
};

function fakeRpcClient(response: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(response);
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

function row(overrides: Partial<PlayerSearchRow> = {}): PlayerSearchRow {
  return {
    player_id: "11111111-1111-4111-8111-111111111111",
    full_name: "Jugador Uno",
    avatar_path: null,
    position: "delantero",
    age: 25,
    city: "Pilar",
    province: "Buenos Aires",
    matches_played: 3,
    is_seeking_team: true,
    distance_km: 0,
    total_count: 3,
    ...overrides,
  };
}

describe("searchPlayers", () => {
  it("traduce los parámetros a los de la función de T09a", async () => {
    const { client, rpc } = fakeRpcClient({ data: [], error: null });

    await searchPlayers(client, { ...PARAMS, position: "mediocampista", offset: 20 });

    expect(rpc).toHaveBeenCalledWith("search_players", {
      p_radius_km: 50,
      p_position: "mediocampista",
      p_seeking_only: true,
      p_limit: 20,
      p_offset: 20,
    });
  });

  it("devuelve las filas y el total sin paginar", async () => {
    const rows = [row(), row({ player_id: "22222222-2222-4222-8222-222222222222" })];
    const { client } = fakeRpcClient({ data: rows, error: null });

    expect(await searchPlayers(client, PARAMS)).toEqual({
      status: "ok",
      rows,
      total: 3,
    });
  });

  it("sin filas el total es 0", async () => {
    const { client } = fakeRpcClient({ data: [], error: null });

    expect(await searchPlayers(client, PARAMS)).toEqual({
      status: "ok",
      rows: [],
      total: 0,
    });
  });

  it("convierte search_origin_missing en un estado y no en un error", async () => {
    const { client } = fakeRpcClient({
      data: null,
      error: { code: "P0001", message: "search_origin_missing" },
    });

    expect(await searchPlayers(client, PARAMS)).toEqual({ status: "origin_missing" });
  });

  it("deja pasar cualquier otro error", async () => {
    const error = { code: "42501", message: "search_delegates_only" };
    const { client } = fakeRpcClient({ data: null, error });

    await expect(searchPlayers(client, PARAMS)).rejects.toBe(error);
  });

  it("no llama a la función con un radio fuera de rango", async () => {
    const { client, rpc } = fakeRpcClient({ data: [], error: null });

    await expect(searchPlayers(client, { ...PARAMS, radius: 201 })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
