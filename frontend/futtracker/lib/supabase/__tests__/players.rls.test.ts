import { beforeAll, describe, expect, it } from "vitest";

import { isUnknownZoneError } from "@/lib/data/zones";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// A través de PostgREST y no de psql: es el único camino que también pasa por
// los grants.
describe.skipIf(!IS_LOCAL)("RLS de public.players", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let delegate: TestUser;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
    delegate = await signUpUser("delegate");

    const { error } = await playerB.client
      .from("players")
      .insert({ id: playerB.id, position: "arquero", bio: "Ficha de B" });

    if (error) {
      throw new Error(`No se pudo preparar la ficha de B: ${error.message}`);
    }
  });

  describe("sin sesión", () => {
    // Se asserta el código y no solo `data` vacío: sin sesión el corte lo hace
    // el grant, antes que RLS, y las dos cosas devuelven cero filas. Si algún
    // día aparece un `grant select to anon`, esta aserción lo marca.
    it("no lee ninguna fila, aunque el seed tenga jugadores", async () => {
      const { data, error } = await anon.from("players").select("id");

      expect(error?.code).toBe("42501");
      expect(data ?? []).toHaveLength(0);
    });

    it("no puede insertar", async () => {
      const { error } = await anon
        .from("players")
        .insert({ id: playerA.id, position: "delantero" });

      expect(error?.code).toBe("42501");
    });
  });

  describe("con sesión, sobre la ficha propia", () => {
    it("puede crear su ficha", async () => {
      const { data, error } = await playerA.client
        .from("players")
        .insert({ id: playerA.id, position: "delantero", city: "Pilar" })
        .select("id, position, city")
        .single();

      expect(error).toBeNull();
      expect(data).toEqual({
        id: playerA.id,
        position: "delantero",
        city: "Pilar",
      });
    });

    it("puede editar su bio", async () => {
      const { data } = await playerA.client
        .from("players")
        .update({ bio: "Nueve de área" })
        .eq("id", playerA.id)
        .select("bio");

      expect(data).toEqual([{ bio: "Nueve de área" }]);
    });

    /**
     * El camino que usa `upsertPlayer`. PostgREST manda el `id` dentro del
     * `set` del `on conflict`, así que un grant de update que no lo incluya
     * hace fallar el segundo guardado del perfil, que es el caso normal.
     */
    it("puede volver a guardar la ficha con upsert", async () => {
      const { error } = await playerA.client
        .from("players")
        .upsert({ id: playerA.id, position: "mediocampista", city: "Pilar" });

      expect(error).toBeNull();
    });

    it("NO puede borrarla: el borrado va con la cuenta, por cascade", async () => {
      const { error } = await playerA.client
        .from("players")
        .delete()
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });
  });

  describe("con sesión, sobre la ficha de otro", () => {
    it("la puede leer: las fichas son visibles para quien tenga cuenta", async () => {
      const { data } = await playerA.client
        .from("players")
        .select("id")
        .eq("id", playerB.id)
        .single();

      expect(data?.id).toBe(playerB.id);
    });

    it("ve las fichas del seed", async () => {
      const { data } = await playerA.client.from("players").select("id");

      expect((data ?? []).length).toBeGreaterThanOrEqual(5);
    });

    it("NO la puede crear a nombre de otro", async () => {
      const { error } = await playerA.client
        .from("players")
        .insert({ id: playerB.id, position: "arquero" });

      expect(error?.code).toBe("42501");
    });

    /**
     * `id` está en el grant de update para que ande el upsert. El que impide
     * mudar la ficha a otra cuenta es el `with check` de la política, no el
     * grant: si esta aserción cambia, un jugador puede pisar la ficha ajena.
     */
    it("NO puede pasarle su ficha cambiándose el id", async () => {
      const { error } = await playerA.client
        .from("players")
        .update({ id: playerB.id })
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });

    it("NO la puede editar", async () => {
      const { data } = await playerA.client
        .from("players")
        .update({ bio: "Editado por otro" })
        .eq("id", playerB.id)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { data: untouched } = await playerB.client
        .from("players")
        .select("bio")
        .eq("id", playerB.id)
        .single();

      expect(untouched?.bio).toBe("Ficha de B");
    });
  });

  /**
   * Requisito 2: la ficha nace en el primer guardado del perfil, no por
   * trigger. Sin el `exists` sobre `profiles` en la política de insert, una
   * cuenta de delegado podría crearse una ficha de jugador para sí misma.
   */
  describe("cuenta de delegado", () => {
    it("NO puede crearse una ficha, ni siquiera la propia", async () => {
      const { error } = await delegate.client
        .from("players")
        .insert({ id: delegate.id, position: "mediocampista" });

      expect(error?.code).toBe("42501");
    });

    it("puede leer las fichas: el listado no es solo para jugadores", async () => {
      const { data } = await delegate.client
        .from("players")
        .select("id")
        .eq("id", playerB.id)
        .single();

      expect(data?.id).toBe(playerB.id);
    });
  });

  describe("checks de la tabla", () => {
    it("rechaza una altura de 300 cm", async () => {
      const { error } = await playerA.client
        .from("players")
        .update({ height_cm: 300 })
        .eq("id", playerA.id);

      expect(error?.code).toBe("23514");
    });

    it("rechaza una posición que no existe", async () => {
      const { error } = await playerA.client
        .from("players")
        .update({ position: "arbitro" })
        .eq("id", playerA.id);

      expect(error?.code).toBe("23514");
    });

    it("rechaza una bio de más de 1000 caracteres", async () => {
      const { error } = await playerA.client
        .from("players")
        .update({ bio: "a".repeat(1001) })
        .eq("id", playerA.id);

      expect(error?.code).toBe("23514");
    });
  });

  describe("columnas que maneja la base", () => {
    /**
     * El grant de update va por columna, así que `created_at` no está en la
     * lista. Con un grant sobre la tabla entera, un PATCH desde el navegador
     * podría antedatar la ficha.
     */
    it("NO deja escribir created_at", async () => {
      const { error } = await playerA.client
        .from("players")
        .update({ created_at: "2000-01-01T00:00:00Z" })
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });

    it("el trigger mueve updated_at en cada edición", async () => {
      const { data: before } = await playerA.client
        .from("players")
        .select("updated_at")
        .eq("id", playerA.id)
        .single();

      await playerA.client
        .from("players")
        .update({ city: "Escobar" })
        .eq("id", playerA.id);

      const { data: after } = await playerA.client
        .from("players")
        .select("updated_at")
        .eq("id", playerA.id)
        .single();

      expect(
        new Date(after!.updated_at).getTime(),
      ).toBeGreaterThan(new Date(before!.updated_at).getTime());
    });
  });
});

// T09c: la ubicación la deriva la base de la zona. Ni el formulario ni una
// llamada directa pueden guardar coordenadas propias.
//
// Cada caso arma su propio punto de partida y chequea el error de cada update.
// Encadenados sobre el estado del anterior, un update que fallara en silencio
// dejaba la fila como venía, y algunos casos pasaban aunque no existiera el
// trigger (observación de QA).
describe.skipIf(!IS_LOCAL)("zona de public.players (T09c)", () => {
  let playerA: TestUser;
  let playerB: TestUser;

  beforeAll(async () => {
    [playerA, playerB] = await Promise.all([signUpUser("player"), signUpUser("player")]);

    for (const player of [playerA, playerB]) {
      const { error } = await player.client
        .from("players")
        .insert({ id: player.id, position: "delantero" });

      if (error) {
        throw new Error(`No se pudo preparar la ficha: ${error.message}`);
      }
    }
  });

  async function update(values: TablesUpdate<"players">) {
    const { data, error } = await playerA.client
      .from("players")
      .update(values)
      .eq("id", playerA.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  }

  async function location() {
    const { data } = await playerA.client
      .from("players")
      .select("zone_id, city, province, latitude, longitude")
      .eq("id", playerA.id)
      .single();

    return data;
  }

  it("al elegir una zona, la fila toma ciudad, provincia y coordenadas", async () => {
    await update({ zone_id: null, city: null, province: null });

    await update({ zone_id: "san-isidro" });

    expect(await location()).toEqual({
      zone_id: "san-isidro",
      city: "San Isidro",
      province: "Buenos Aires",
      latitude: -34.4708,
      longitude: -58.5286,
    });
  });

  it("con zona, un update directo de coordenadas no las pisa", async () => {
    await update({ zone_id: "san-isidro" });

    await update({ latitude: 0, longitude: 0 });

    expect(await location()).toMatchObject({ latitude: -34.4708, longitude: -58.5286 });
  });

  it("al quitar la zona no quedan coordenadas, pero la ciudad de texto se conserva", async () => {
    await update({ zone_id: "san-isidro" });

    await update({ zone_id: null });

    expect(await location()).toEqual({
      zone_id: null,
      city: "San Isidro",
      province: "Buenos Aires",
      latitude: null,
      longitude: null,
    });
  });

  // El update de coordenadas tiene que funcionar (se chequea su error) y aun
  // así dejarlas en null: sin el trigger, quedarían guardadas.
  it("un perfil sin zona no puede poner coordenadas a mano", async () => {
    await update({ zone_id: null, city: "Pilar" });

    await update({ latitude: -34.5, longitude: -58.9 });

    expect(await location()).toMatchObject({
      zone_id: null,
      city: "Pilar",
      latitude: null,
      longitude: null,
    });
  });

  it("una zona que no existe rebota en la foránea", async () => {
    const { error } = await playerA.client
      .from("players")
      .update({ zone_id: "no-existe" })
      .eq("id", playerA.id);

    expect(error?.code).toBe("23503");
    expect(isUnknownZoneError(error)).toBe(true);
  });

  it("no se cambia la zona de otro jugador: afecta 0 filas", async () => {
    const { data, error } = await playerA.client
      .from("players")
      .update({ zone_id: "pilar" })
      .eq("id", playerB.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
