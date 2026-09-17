import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";
import type { TablesInsert } from "@/lib/supabase/database.types";

async function createEntry(
  user: TestUser,
  fields: Partial<TablesInsert<"career_entries">> = {},
) {
  const { data, error } = await user.client
    .from("career_entries")
    .insert({
      player_id: user.id,
      club_name: "Club de prueba",
      position: "arquero",
      start_date: "2025-02-01",
      end_date: "2025-12-01",
      ...fields,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`No se pudo preparar la entrada: ${error?.message}`);
  }

  return data.id;
}

async function createMatch(
  user: TestUser,
  careerEntryId: string,
  fields: Partial<TablesInsert<"match_stats">> = {},
) {
  const { data, error } = await user.client
    .from("match_stats")
    .insert({
      career_entry_id: careerEntryId,
      player_id: user.id,
      match_date: "2025-03-01",
      opponent: `Rival ${crypto.randomUUID()}`,
      ...fields,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`No se pudo preparar el partido: ${error?.message}`);
  }

  return data.id;
}

describe.skipIf(!IS_LOCAL)("RLS y triggers de public.match_stats", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let goalkeeperEntryOfA: string;
  let defenderEntryOfA: string;
  let entryOfB: string;
  let matchOfB: string;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");

    for (const player of [playerA, playerB]) {
      const { error } = await player.client
        .from("players")
        .insert({ id: player.id, position: "arquero" });

      if (error) {
        throw new Error(`No se pudo preparar la ficha: ${error.message}`);
      }
    }

    goalkeeperEntryOfA = await createEntry(playerA);
    defenderEntryOfA = await createEntry(playerA, {
      position: "defensor",
      start_date: "2024-01-01",
      end_date: "2024-12-01",
    });
    entryOfB = await createEntry(playerB);
    matchOfB = await createMatch(playerB, entryOfB, { goals: 1 });
  });

  describe("sin sesión", () => {
    it.each([
      ["match_stats", () => anon.from("match_stats").select("*")],
      ["season_stats", () => anon.from("season_stats").select("*")],
      ["player_career_totals", () => anon.from("player_career_totals").select("*")],
    ])("lee cero filas de %s, sin error de permisos", async (_, query) => {
      const { data, error } = await query();

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("no puede insertar", async () => {
      const { error } = await anon.from("match_stats").insert({
        career_entry_id: goalkeeperEntryOfA,
        player_id: playerA.id,
        match_date: "2025-03-01",
        opponent: "Rival anónimo",
      });

      expect(error?.code).toBe("42501");
    });
  });

  describe("con sesión, sobre los partidos propios", () => {
    it("puede cargar, editar y borrar un partido", async () => {
      const id = await createMatch(playerA, goalkeeperEntryOfA);

      const { data: updated } = await playerA.client
        .from("match_stats")
        .update({ goals: 2 })
        .eq("id", id)
        .select("goals");

      expect(updated).toEqual([{ goals: 2 }]);

      const { data: deleted } = await playerA.client
        .from("match_stats")
        .delete()
        .eq("id", id)
        .select("id");

      expect(deleted).toEqual([{ id }]);
    });
  });

  describe("con sesión, sobre los partidos de otro", () => {
    it("los puede leer: el requisito 7 abre la lectura a cualquier cuenta", async () => {
      const { data } = await playerA.client
        .from("match_stats")
        .select("goals")
        .eq("id", matchOfB)
        .single();

      expect(data?.goals).toBe(1);
    });

    it("NO los puede crear a nombre de otro", async () => {
      const { error } = await playerA.client.from("match_stats").insert({
        career_entry_id: entryOfB,
        player_id: playerB.id,
        match_date: "2025-04-01",
        opponent: "Rival ajeno",
      });

      expect(error?.code).toBe("42501");
    });

    it("NO puede colgar un partido propio de la entrada de otro", async () => {
      const { error } = await playerA.client.from("match_stats").insert({
        career_entry_id: entryOfB,
        player_id: playerA.id,
        match_date: "2025-04-01",
        opponent: "Rival cruzado",
      });

      expect(error?.code).toBe("23514");
    });

    it("NO los puede editar", async () => {
      const { data } = await playerA.client
        .from("match_stats")
        .update({ goals: 9 })
        .eq("id", matchOfB)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { data: untouched } = await playerB.client
        .from("match_stats")
        .select("goals")
        .eq("id", matchOfB)
        .single();

      expect(untouched?.goals).toBe(1);
    });

    it("NO los puede borrar", async () => {
      const { data } = await playerA.client
        .from("match_stats")
        .delete()
        .eq("id", matchOfB)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { count } = await playerB.client
        .from("match_stats")
        .select("id", { count: "exact", head: true })
        .eq("id", matchOfB);

      expect(count).toBe(1);
    });
  });

  describe("valla invicta", () => {
    it("la rechaza si la posición de la entrada no es arquero", async () => {
      const { error } = await playerA.client.from("match_stats").insert({
        career_entry_id: defenderEntryOfA,
        player_id: playerA.id,
        match_date: "2024-03-01",
        opponent: "Rival del defensor",
        clean_sheet: true,
      });

      expect(error?.code).toBe("23514");
    });

    it("la acepta si la posición de la entrada es arquero", async () => {
      await expect(
        createMatch(playerA, goalkeeperEntryOfA, { clean_sheet: true }),
      ).resolves.toBeTypeOf("string");
    });
  });

  it("rechaza una match_date fuera del período de la entrada", async () => {
    const { error } = await playerA.client.from("match_stats").insert({
      career_entry_id: goalkeeperEntryOfA,
      player_id: playerA.id,
      match_date: "2026-03-01",
      opponent: "Rival fuera de fecha",
    });

    expect(error?.code).toBe("23514");
  });

  describe("cambios en career_entries que dejarían partidos inválidos", () => {
    it("rechaza acortar el período e informa cuántos partidos lo impiden", async () => {
      const entry = await createEntry(playerA, { club_name: "Club período" });
      await createMatch(playerA, entry, { match_date: "2025-10-01" });

      const { error } = await playerA.client
        .from("career_entries")
        .update({ end_date: "2025-06-01" })
        .eq("id", entry);

      expect(error?.code).toBe("23514");
      expect(error?.message).toContain("1 partido(s)");
    });

    it("rechaza cambiar la posición desde arquero e informa cuántos partidos lo impiden", async () => {
      const entry = await createEntry(playerA, { club_name: "Club posición" });
      await createMatch(playerA, entry, { clean_sheet: true });

      const { error } = await playerA.client
        .from("career_entries")
        .update({ position: "defensor" })
        .eq("id", entry);

      expect(error?.code).toBe("23514");
      expect(error?.message).toContain("1 partido(s)");
    });
  });

  it("rechaza el duplicado (career_entry_id, match_date, opponent)", async () => {
    const duplicate = {
      career_entry_id: goalkeeperEntryOfA,
      player_id: playerA.id,
      match_date: "2025-05-01",
      opponent: "Rival repetido",
    };

    await playerA.client.from("match_stats").insert(duplicate);
    const { error } = await playerA.client.from("match_stats").insert(duplicate);

    expect(error?.code).toBe("23505");
  });

  it("borrar la entrada borra sus partidos y sus filas en las vistas", async () => {
    const entry = await createEntry(playerA, { club_name: "Club borrado" });
    await createMatch(playerA, entry);

    await playerA.client.from("career_entries").delete().eq("id", entry);

    const { data: matches } = await playerA.client
      .from("match_stats")
      .select("id")
      .eq("career_entry_id", entry);
    const { data: seasons } = await playerA.client
      .from("season_stats")
      .select("career_entry_id")
      .eq("career_entry_id", entry);

    expect(matches).toEqual([]);
    expect(seasons).toEqual([]);
  });
});
