import { beforeAll, describe, expect, it } from "vitest";

import { suggestTeams } from "@/lib/data/suggestions";
import { IS_LOCAL, newClient, type Client } from "@/lib/supabase/__tests__/rls-client";

// T12a · `suggest_teams` contra la base real, con las cuentas del seed.
//
// Todo es lectura: la función no escribe, así que no hace falta dar de alta
// filas nuevas. Los nombres son los del seed (ver la sección T12a de
// `supabase/seed.sql`).
//
// Las distancias difieren de los rangos del ticket: P3 está en el centro de
// San Isidro (T09c) y TB en Vicente López, la zona más cercana (6,6 km). El PO
// corrige esos rangos; el orden, los conteos y los radios son los del ticket.
const SEED_PASSWORD = "password123";

const VA1 = "0d000a01-0000-4000-8000-000000000125";
const VB1 = "0d000b01-0000-4000-8000-000000000125";
const VB2 = "0d000b02-0000-4000-8000-000000000125";
const TB = "c00000b0-0000-4000-8000-000000000125";

const COLUMNS = [
  "vacancy_id",
  "team_id",
  "team_name",
  "crest_path",
  "city",
  "province",
  "category",
  "position",
  "modality",
  "level",
  "description",
  "distance_km",
  "applied",
  "total_count",
];

async function signIn(email: string): Promise<Client> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  }

  return client;
}

describe.skipIf(!IS_LOCAL)("T12a · suggest_teams", () => {
  let p1: Client;
  let p3: Client;
  let p6: Client;
  let p9: Client;
  let pj0: Client;
  let d1: Client;

  beforeAll(async () => {
    [p1, p3, p6, p9, pj0, d1] = await Promise.all([
      signIn("busqueda.p1@example.com"),
      signIn("busqueda.p3@example.com"),
      signIn("busqueda.p6@example.com"),
      signIn("sugerencias.p9@example.com"),
      signIn("postulaciones.pj0@example.com"),
      signIn("busqueda.d1@example.com"),
    ]);
  });

  describe("coincidencias, orden y distancia", () => {
    it("P3 con el radio por defecto: solo VB1, sin postular", async () => {
      const { data, error } = await p3.rpc("suggest_teams");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0]).toMatchObject({ vacancy_id: VB1, applied: false, total_count: 1 });
      expect(data![0].distance_km).toBeGreaterThan(6);
      expect(data![0].distance_km).toBeLessThan(7);
    });

    it("P3 a 50 km: VB1 y después VA1, con VA1 ya postulada", async () => {
      const { data, error } = await p3.rpc("suggest_teams", { p_radius_km: 50 });

      expect(error).toBeNull();
      expect(data!.map((row) => [row.vacancy_id, row.applied])).toEqual([
        [VB1, false],
        [VA1, true],
      ]);
      expect(data!.every((row) => row.total_count === 2)).toBe(true);
      expect(data![1].distance_km).toBeGreaterThan(35);
      expect(data![1].distance_km).toBeLessThan(36);
    });

    it("P3 a 200 km: 2 (TC en Rosario queda más lejos y TE no tiene coordenadas)", async () => {
      const { data } = await p3.rpc("suggest_teams", { p_radius_km: 200 });

      expect(data).toHaveLength(2);
      expect(data![0].total_count).toBe(2);
    });

    it("P3 a 1 km: ninguna", async () => {
      const { data, error } = await p3.rpc("suggest_teams", { p_radius_km: 1 });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("TB aparece una sola vez, con su vacante abierta y no con la cerrada", async () => {
      const { data } = await p3.rpc("suggest_teams", { p_radius_km: 50 });
      const tb = data!.filter((row) => row.team_id === TB);

      expect(tb).toHaveLength(1);
      expect(tb[0].vacancy_id).toBe(VB1);
    });

    it("solo devuelve vacantes de la posición del jugador", async () => {
      const { data } = await p3.rpc("suggest_teams", { p_radius_km: 200 });

      expect(data!.every((row) => row.position === "mediocampista")).toBe(true);
    });

    it("P1 a 50 km: solo VB2", async () => {
      const { data } = await p1.rpc("suggest_teams", { p_radius_km: 50 });

      expect(data!.map((row) => row.vacancy_id)).toEqual([VB2]);
      expect(data![0].distance_km).toBeGreaterThan(38);
      expect(data![0].distance_km).toBeLessThan(39);
    });

    it("P1 a 25 km: ninguna", async () => {
      const { data } = await p1.rpc("suggest_teams", { p_radius_km: 25 });

      expect(data).toEqual([]);
    });
  });

  describe("paginación", () => {
    it.each([
      [0, [VB1]],
      [1, [VA1]],
      [2, []],
    ])("P3 a 50 km, de a 1, offset %i", async (offset, expected) => {
      const { data, error } = await p3.rpc("suggest_teams", {
        p_radius_km: 50,
        p_limit: 1,
        p_offset: offset,
      });

      expect(error).toBeNull();
      expect(data!.map((row) => row.vacancy_id)).toEqual(expected);
      if (expected.length > 0) {
        expect(data![0].total_count).toBe(2);
      }
    });
  });

  describe("privacidad", () => {
    it("devuelve exactamente las columnas del contrato, sin dueño, mail ni coordenadas", async () => {
      const { data } = await p3.rpc("suggest_teams", { p_radius_km: 50 });

      expect(Object.keys(data![0]).sort()).toEqual([...COLUMNS].sort());
    });
  });

  describe("errores", () => {
    it.each([
      ["radio 0", { p_radius_km: 0 }, "invalid_radius"],
      ["radio 201", { p_radius_km: 201 }, "invalid_radius"],
      ["límite 51", { p_radius_km: 50, p_limit: 51 }, "invalid_limit"],
      ["offset -1", { p_radius_km: 50, p_limit: 10, p_offset: -1 }, "invalid_offset"],
    ])("P3 con %s: 22023 %s", async (_caso, args, message) => {
      const { error } = await p3.rpc("suggest_teams", args);

      expect(error).toMatchObject({ code: "22023", message });
    });

    it.each([
      ["P6, sin coordenadas", () => p6, "suggestion_origin_missing"],
      ["P9, sin posición", () => p9, "suggestion_position_missing"],
      ["PJ0, sin ficha", () => pj0, "suggestion_profile_incomplete"],
    ])("%s: P0001 %s", async (_caso, client, message) => {
      const { error } = await client().rpc("suggest_teams", { p_radius_km: 50 });

      expect(error).toMatchObject({ code: "P0001", message });
    });

    it("el delegado D1: 42501 suggestions_players_only", async () => {
      const { error } = await d1.rpc("suggest_teams", { p_radius_km: 50 });

      expect(error).toMatchObject({ code: "42501", message: "suggestions_players_only" });
    });

    it("el rol se chequea antes que los parámetros", async () => {
      const { error } = await d1.rpc("suggest_teams", { p_radius_km: 0 });

      expect(error).toMatchObject({ code: "42501", message: "suggestions_players_only" });
    });

    it("los parámetros se chequean antes que el perfil", async () => {
      const { error } = await p6.rpc("suggest_teams", { p_radius_km: 0 });

      expect(error).toMatchObject({ code: "22023", message: "invalid_radius" });
    });

    it("sin sesión: 42501 de permisos, sin llegar a la función", async () => {
      const { error } = await newClient().rpc("suggest_teams", { p_radius_km: 50 });

      expect(error?.code).toBe("42501");
      expect(error?.message).not.toBe("suggestions_players_only");
    });
  });

  describe("helper suggestTeams", () => {
    it("P3: filas y total", async () => {
      const result = await suggestTeams(p3, { radius: 50 });

      expect(result.ok).toBe(true);
      expect(result.ok && result.rows.map((row) => row.vacancy_id)).toEqual([VB1, VA1]);
      expect(result.ok && result.total).toBe(2);
    });

    it.each([
      ["P6", () => p6, "missingLocation"],
      ["P9", () => p9, "completeProfile"],
      ["PJ0", () => pj0, "completeProfile"],
      ["D1", () => d1, "playersOnly"],
    ])("%s: %s", async (_caso, client, reason) => {
      expect(await suggestTeams(client(), { radius: 50 })).toEqual({ ok: false, reason });
    });
  });

  describe("seed", () => {
    it("existen TB, TC y TE, y E1, E2 y E3 quedaron sin coordenadas", async () => {
      const { data } = await p3
        .from("teams")
        .select("id, zone_id, latitude")
        .in("id", [
          TB,
          "c00000c0-0000-4000-8000-000000000125",
          "c00000e0-0000-4000-8000-000000000125",
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ]);

      const byId = Object.fromEntries(data!.map((team) => [team.id, team]));
      expect(byId[TB].zone_id).toBe("vicente-lopez");
      expect(byId["c00000c0-0000-4000-8000-000000000125"].zone_id).toBe("rosario");
      expect(byId["c00000e0-0000-4000-8000-000000000125"].latitude).toBeNull();
      expect(byId["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"].latitude).toBeNull();
      expect(byId["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"].latitude).toBeNull();
      expect(byId["cccccccc-cccc-4ccc-8ccc-cccccccccccc"].latitude).toBeNull();
    });

    it("existen las 7 vacantes, P9 y la postulación de P3 a VA1", async () => {
      const { data: vacancies } = await p3
        .from("vacancies")
        .select("id")
        .in(
          "id",
          ["a01", "a02", "b01", "b02", "b03", "c01", "e01"].map(
            (suffix) => `0d000${suffix}-0000-4000-8000-000000000125`,
          ),
        );
      const { data: p9Row } = await p3
        .from("players")
        .select("id, position")
        .eq("id", "f0000009-0000-4000-8000-000000000125")
        .single();
      const { data: applications } = await p3
        .from("vacancy_applications")
        .select("vacancy_id")
        .eq("vacancy_id", VA1);

      expect(vacancies).toHaveLength(7);
      expect(p9Row).toEqual({ id: "f0000009-0000-4000-8000-000000000125", position: null });
      expect(applications).toEqual([{ vacancy_id: VA1 }]);
    });
  });
});
