import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  mapSuggestTeamsError,
  suggestTeams,
  suggestTeamsParamsSchema,
} from "@/lib/data/suggestions";
import type { Database } from "@/lib/supabase/database.types";

const VB1_ROW = {
  vacancy_id: "v-b1",
  team_id: "t-b",
  team_name: "Club TB",
  crest_path: null,
  city: "San Isidro",
  province: "Buenos Aires",
  category: "Primera",
  position: "mediocampista",
  modality: "futbol_11",
  level: "intermedio",
  description: null,
  distance_km: 2.9,
  applied: false,
  total_count: 2,
};

function fakeClient({
  data = [VB1_ROW],
  error = null,
}: {
  data?: Record<string, unknown>[] | null;
  error?: { code: string; message: string } | null;
} = {}) {
  const rpc = vi.fn(async () => ({ data, error }));
  const client = { rpc } as unknown as SupabaseClient<Database>;

  return { client, rpc };
}

describe("suggestTeamsParamsSchema", () => {
  it.each([
    ["radio 0", { radiusKm: 0 }],
    ["radio 201", { radiusKm: 201 }],
    ["límite 51", { limit: 51 }],
    ["offset negativo", { offset: -1 }],
  ])("rechaza %s", (_caso, params) => {
    expect(suggestTeamsParamsSchema.safeParse(params).success).toBe(false);
  });
});

describe("mapSuggestTeamsError", () => {
  it.each([
    ["suggestion_profile_incomplete", "P0001", "completeProfile"],
    ["suggestion_position_missing", "P0001", "completeProfile"],
    ["suggestion_origin_missing", "P0001", "missingLocation"],
    ["suggestions_players_only", "42501", "playersOnly"],
  ])("traduce %s", (message, code, reason) => {
    expect(mapSuggestTeamsError({ code, message })).toBe(reason);
  });

  it("un 42501 de un grant faltante no es 'solo jugadores'", () => {
    expect(
      mapSuggestTeamsError({ code: "42501", message: "permission denied for function suggest_teams" }),
    ).toBeNull();
  });

  it("ignora lo que no es un error de la función", () => {
    expect(mapSuggestTeamsError(null)).toBeNull();
    expect(mapSuggestTeamsError({ code: "22023", message: "invalid_radius" })).toBeNull();
  });
});

describe("suggestTeams", () => {
  it("manda los parámetros p_* a la función", async () => {
    const { client, rpc } = fakeClient();

    await suggestTeams(client, { radiusKm: 50, limit: 10, offset: 10 });

    expect(rpc).toHaveBeenCalledWith("suggest_teams", {
      p_radius_km: 50,
      p_limit: 10,
      p_offset: 10,
    });
  });

  it("devuelve las filas sin total_count y el total de la primera", async () => {
    const { client } = fakeClient({ data: [{ ...VB1_ROW, owner_id: "no-debe-pasar" }] });

    const result = await suggestTeams(client, { radiusKm: 25 });

    expect(result.ok && result.total).toBe(2);
    expect(result.ok && result.rows[0]).not.toHaveProperty("total_count");
    expect(result.ok && result.rows[0]).not.toHaveProperty("owner_id");
  });

  it("sin filas el total es 0", async () => {
    const { client } = fakeClient({ data: [] });

    expect(await suggestTeams(client, { radiusKm: 25 })).toEqual({ ok: true, rows: [], total: 0 });
  });

  it("devuelve la falla esperable como valor", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "P0001", message: "suggestion_origin_missing" },
    });

    expect(await suggestTeams(client, { radiusKm: 25 })).toEqual({
      ok: false,
      reason: "missingLocation",
    });
  });

  it("lanza cualquier otro error", async () => {
    const error = { code: "PGRST000", message: "connection refused" };
    const { client } = fakeClient({ data: null, error });

    await expect(suggestTeams(client, { radiusKm: 25 })).rejects.toBe(error);
  });

  it("no llama a la función con un parámetro inválido", async () => {
    const { client, rpc } = fakeClient();

    await expect(suggestTeams(client, { radiusKm: 999 })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
