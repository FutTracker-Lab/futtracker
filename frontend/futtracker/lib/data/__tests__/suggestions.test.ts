import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  mapSuggestTeamsError,
  suggestTeams,
  suggestTeamsParamsSchema,
} from "@/lib/data/suggestions";
import type { Database } from "@/lib/supabase/database.types";

const VB1_ROW = {
  vacancy_id: "0d000b01-0000-4000-8000-000000000125",
  team_id: "c00000b0-0000-4000-8000-000000000125",
  team_name: "Club Vicente López",
  crest_path: null,
  city: "Vicente López",
  province: "Buenos Aires",
  category: null,
  position: "mediocampista",
  modality: "futbol_11",
  level: "intermedio",
  description: null,
  distance_km: 6.6,
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
  it("completa los valores por defecto de la función", () => {
    expect(suggestTeamsParamsSchema.parse({})).toEqual({
      radius: 25,
      limit: 10,
      offset: 0,
    });
  });

  // Los mismos bordes que valida la función.
  it.each([
    ["radio 0", { radius: 0 }],
    ["radio 201", { radius: 201 }],
    ["radio con decimales", { radius: 10.5 }],
    ["límite 0", { limit: 0 }],
    ["límite 51", { limit: 51 }],
    ["offset negativo", { offset: -1 }],
  ])("rechaza %s", (_caso, params) => {
    expect(suggestTeamsParamsSchema.safeParse(params).success).toBe(false);
  });

  it("acepta los bordes válidos", () => {
    expect(suggestTeamsParamsSchema.safeParse({ radius: 1, limit: 1 }).success).toBe(true);
    expect(suggestTeamsParamsSchema.safeParse({ radius: 200, limit: 50 }).success).toBe(true);
  });
});

describe("mapSuggestTeamsError", () => {
  it.each([
    ["P0001", "suggestion_profile_incomplete", "completeProfile"],
    ["P0001", "suggestion_position_missing", "completeProfile"],
    ["P0001", "suggestion_origin_missing", "missingLocation"],
    ["42501", "suggestions_players_only", "playersOnly"],
  ])("%s %s → %s", (code, message, expected) => {
    expect(mapSuggestTeamsError({ code, message })).toBe(expected);
  });

  it.each([
    // Un 42501 de permisos (un grant que falta) no es "solo para jugadores".
    ["42501", "permission denied for function suggest_teams"],
    // El mismo mensaje con otro código no es la falla esperable.
    ["22023", "suggestion_origin_missing"],
    ["22023", "invalid_radius"],
    ["P0001", "otro_error"],
  ])("no traduce %s %s", (code, message) => {
    expect(mapSuggestTeamsError({ code, message })).toBeNull();
  });

  it("no traduce algo que no es un error de PostgREST", () => {
    expect(mapSuggestTeamsError(null)).toBeNull();
    expect(mapSuggestTeamsError("suggestions_players_only")).toBeNull();
  });
});

describe("suggestTeams", () => {
  it("llama a la función con los parámetros traducidos", async () => {
    const { client, rpc } = fakeClient();

    await suggestTeams(client, { radius: 50, limit: 1, offset: 1 });

    expect(rpc).toHaveBeenCalledWith("suggest_teams", {
      p_radius_km: 50,
      p_limit: 1,
      p_offset: 1,
    });
  });

  it("sin parámetros usa los defaults de la función", async () => {
    const { client, rpc } = fakeClient();

    await suggestTeams(client);

    expect(rpc).toHaveBeenCalledWith("suggest_teams", {
      p_radius_km: 25,
      p_limit: 10,
      p_offset: 0,
    });
  });

  it("devuelve las filas sin total_count y el total aparte", async () => {
    const { client } = fakeClient();

    const result = await suggestTeams(client, { radius: 50 });

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          vacancy_id: VB1_ROW.vacancy_id,
          team_id: VB1_ROW.team_id,
          team_name: "Club Vicente López",
          crest_path: null,
          city: "Vicente López",
          province: "Buenos Aires",
          category: null,
          position: "mediocampista",
          modality: "futbol_11",
          level: "intermedio",
          description: null,
          distance_km: 6.6,
          applied: false,
        },
      ],
      total: 2,
    });
  });

  it("no deja pasar columnas que la función agregue después", async () => {
    const { client } = fakeClient({ data: [{ ...VB1_ROW, owner_id: "x" }] });

    const result = await suggestTeams(client);

    expect(result.ok && result.rows[0]).not.toHaveProperty("owner_id");
  });

  it("con una página vacía el total es 0", async () => {
    const { client } = fakeClient({ data: [] });

    expect(await suggestTeams(client, { offset: 99 })).toEqual({
      ok: true,
      rows: [],
      total: 0,
    });
  });

  it("devuelve la falla esperable como valor", async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: "P0001", message: "suggestion_origin_missing" },
    });

    expect(await suggestTeams(client)).toEqual({
      ok: false,
      reason: "missingLocation",
    });
  });

  it("lanza cualquier otro error", async () => {
    const error = { code: "42501", message: "permission denied for function suggest_teams" };
    const { client } = fakeClient({ data: null, error });

    await expect(suggestTeams(client)).rejects.toBe(error);
  });

  it("lanza un parámetro inválido sin llamar a la base", async () => {
    const { client, rpc } = fakeClient();

    await expect(suggestTeams(client, { radius: 0 })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
