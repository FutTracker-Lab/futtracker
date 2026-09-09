import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// A través de PostgREST y no de psql: es el único camino que también pasa por
// los grants.
describe.skipIf(!IS_LOCAL)("RLS de public.career_entries", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let delegate: TestUser;
  let entryOfB: string;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
    delegate = await signUpUser("delegate");

    for (const player of [playerA, playerB]) {
      const { error } = await player.client
        .from("players")
        .insert({ id: player.id, position: "delantero" });

      if (error) {
        throw new Error(`No se pudo preparar la ficha: ${error.message}`);
      }
    }

    const { data, error } = await playerB.client
      .from("career_entries")
      .insert({
        player_id: playerB.id,
        club_name: "Club de B",
        start_date: "2020-01-01",
        end_date: "2023-12-31",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo preparar la entrada de B: ${error?.message}`);
    }

    entryOfB = data.id;
  });

  describe("sin sesión", () => {
    // Acá `career_entries` se aparta de `players`, que responde 42501: el
    // `grant select to anon` es a propósito. Quien corta es la política, que
    // solo alcanza a `authenticated`.
    it("lee cero filas, sin error de permisos", async () => {
      const { data, error } = await anon.from("career_entries").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("no puede insertar", async () => {
      const { error } = await anon.from("career_entries").insert({
        player_id: playerA.id,
        club_name: "Club anónimo",
        start_date: "2024-01-01",
      });

      expect(error?.code).toBe("42501");
    });
  });

  describe("con sesión, sobre las entradas propias", () => {
    it("puede cargar una entrada", async () => {
      const { data, error } = await playerA.client
        .from("career_entries")
        .insert({
          player_id: playerA.id,
          club_name: "Club Atlético Fénix",
          category: "Primera",
          start_date: "2021-08-01",
          is_current: true,
        })
        .select("club_name, category, is_current")
        .single();

      expect(error).toBeNull();
      expect(data).toEqual({
        club_name: "Club Atlético Fénix",
        category: "Primera",
        is_current: true,
      });
    });

    it("puede editarla", async () => {
      const { data } = await playerA.client
        .from("career_entries")
        .update({ category: "Reserva" })
        .eq("player_id", playerA.id)
        .select("category");

      expect(data).toEqual([{ category: "Reserva" }]);
    });

    it("puede borrarla", async () => {
      const { data: created } = await playerA.client
        .from("career_entries")
        .insert({
          player_id: playerA.id,
          club_name: "Club cargado por error",
          start_date: "2019-01-01",
        })
        .select("id")
        .single();

      const { data: deleted, error } = await playerA.client
        .from("career_entries")
        .delete()
        .eq("id", created!.id)
        .select("id");

      expect(error).toBeNull();
      expect(deleted).toEqual([{ id: created!.id }]);
    });
  });

  describe("con sesión, sobre las entradas de otro", () => {
    it("las puede leer: la trayectoria es visible para quien tenga cuenta", async () => {
      const { data } = await playerA.client
        .from("career_entries")
        .select("club_name")
        .eq("id", entryOfB)
        .single();

      expect(data?.club_name).toBe("Club de B");
    });

    it("NO las puede crear a nombre de otro", async () => {
      const { error } = await playerA.client.from("career_entries").insert({
        player_id: playerB.id,
        club_name: "Club ajeno",
        start_date: "2024-01-01",
      });

      expect(error?.code).toBe("42501");
    });

    it("NO las puede editar", async () => {
      const { data } = await playerA.client
        .from("career_entries")
        .update({ club_name: "Editado por otro" })
        .eq("id", entryOfB)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { data: untouched } = await playerB.client
        .from("career_entries")
        .select("club_name")
        .eq("id", entryOfB)
        .single();

      expect(untouched?.club_name).toBe("Club de B");
    });

    it("NO las puede borrar", async () => {
      const { data } = await playerA.client
        .from("career_entries")
        .delete()
        .eq("id", entryOfB)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { count } = await playerB.client
        .from("career_entries")
        .select("id", { count: "exact", head: true })
        .eq("id", entryOfB);

      expect(count).toBe(1);
    });

    // Cortan las dos capas y las dos dan 42501: `player_id` no está en el
    // grant de update, y el `with check` tampoco lo dejaría pasar.
    it("NO puede mudarle una entrada propia cambiándole el player_id", async () => {
      const { error } = await playerA.client
        .from("career_entries")
        .update({ player_id: playerB.id })
        .eq("player_id", playerA.id);

      expect(error?.code).toBe("42501");
    });
  });

  // El insert no repite el `exists` de `players_insert`: acá corta la FK
  // contra `players`, de ahí el 23503 en vez de 42501. Si un delegado alguna
  // vez pudiera tener ficha de jugador, hay que agregar el `exists`.
  describe("cuenta de delegado", () => {
    it("NO puede cargarse una trayectoria: no tiene ficha de jugador", async () => {
      const { error } = await delegate.client.from("career_entries").insert({
        player_id: delegate.id,
        club_name: "Club del delegado",
        start_date: "2024-01-01",
      });

      expect(error?.code).toBe("23503");
    });

    it("puede leer las trayectorias: el listado no es solo para jugadores", async () => {
      const { data } = await delegate.client
        .from("career_entries")
        .select("club_name")
        .eq("id", entryOfB)
        .single();

      expect(data?.club_name).toBe("Club de B");
    });
  });

  describe("checks de la tabla", () => {
    it.each([
      {
        caso: "end_date anterior a start_date",
        fields: { end_date: "2023-01-01" },
      },
      {
        caso: "is_current con end_date cargada",
        fields: { end_date: "2025-01-01", is_current: true },
      },
      { caso: "un club de un solo caracter", fields: { club_name: "A" } },
      { caso: "una posición que no existe", fields: { position: "arbitro" } },
    ])("rechaza $caso", async ({ fields }) => {
      const { error } = await playerA.client.from("career_entries").insert({
        player_id: playerA.id,
        club_name: "Club de prueba",
        start_date: "2024-03-01",
        ...fields,
      });

      expect(error?.code).toBe("23514");
    });
  });

  describe("columnas que maneja la base", () => {
    // Los grants de escritura van por columna: con uno sobre la tabla entera,
    // un PATCH desde el navegador podría antedatar la entrada.
    it("NO deja escribir created_at", async () => {
      const { error } = await playerA.client
        .from("career_entries")
        .update({ created_at: "2000-01-01T00:00:00Z" })
        .eq("player_id", playerA.id);

      expect(error?.code).toBe("42501");
    });

    it("NO deja elegir el id en el insert", async () => {
      const { error } = await playerA.client.from("career_entries").insert({
        id: "00000000-0000-4000-8000-000000000000",
        player_id: playerA.id,
        club_name: "Club con id elegido",
        start_date: "2024-01-01",
      });

      expect(error?.code).toBe("42501");
    });

    it("el trigger mueve updated_at en cada edición", async () => {
      const { data: created } = await playerA.client
        .from("career_entries")
        .insert({
          player_id: playerA.id,
          club_name: "Club con timestamps",
          start_date: "2018-01-01",
        })
        .select("id, updated_at")
        .single();

      const { data: updated } = await playerA.client
        .from("career_entries")
        .update({ category: "Sexta división" })
        .eq("id", created!.id)
        .select("updated_at")
        .single();

      expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
        new Date(created!.updated_at).getTime(),
      );
    });
  });

  // El cascade no se prueba acá: se dispara borrando la cuenta de
  // `auth.users`, que ninguna sesión puede hacer (`profiles` no tiene política
  // de delete). Se verifica a mano con psql, como pide el ticket.
});
