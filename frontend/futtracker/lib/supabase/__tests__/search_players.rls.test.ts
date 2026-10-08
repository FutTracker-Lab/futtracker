import { beforeAll, describe, expect, it } from "vitest";

import { searchPlayers } from "@/lib/data/players";
import {
  IS_LOCAL,
  newClient,
  type Client,
} from "@/lib/supabase/__tests__/rls-client";

// A diferencia de los otros tests de RLS, estos no crean usuarios: los
// criterios de T09a son conteos exactos sobre el escenario geográfico del
// seed (D1 con su equipo en Pilar, P1 a P7 y el relleno), así que se loguean
// con esas cuentas. La password es la del seed.
//
// Ningún otro test crea jugadores con coordenadas; si alguno empezara a
// hacerlo cerca de Pilar, los conteos de acá dejarían de cerrar.
const SEED_PASSWORD = "password123";

const P1 = "f0000001-0000-4000-8000-000000000108";
const P2 = "f0000002-0000-4000-8000-000000000108";
const P3 = "f0000003-0000-4000-8000-000000000108";
const P4 = "f0000004-0000-4000-8000-000000000108";
const P6 = "f0000006-0000-4000-8000-000000000108";
const P7 = "f0000007-0000-4000-8000-000000000108";

async function signIn(email: string): Promise<Client> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: SEED_PASSWORD,
  });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  }

  return client;
}

function ids(rows: { player_id: string }[] | null) {
  return (rows ?? []).map((row) => row.player_id);
}

describe.skipIf(!IS_LOCAL)("search_players", () => {
  let anon: Client;
  let d1: Client;
  let d2: Client;
  let d3: Client;
  let p1: Client;

  beforeAll(async () => {
    anon = newClient();
    [d1, d2, d3, p1] = await Promise.all([
      signIn("busqueda.d1@example.com"),
      signIn("busqueda.d2@example.com"),
      signIn("busqueda.d3@example.com"),
      signIn("busqueda.p1@example.com"),
    ]);
  });

  describe("resultados para el delegado D1 (equipo en Pilar)", () => {
    it("a 50 km devuelve P1, P2 y P3, en ese orden y con sus distancias", async () => {
      const { data, error } = await d1.rpc("search_players", { p_radius_km: 50 });

      expect(error).toBeNull();
      expect(ids(data)).toEqual([P1, P2, P3]);
      expect(data?.[0].distance_km).toBe(0);
      expect(data?.[1].distance_km).toBeGreaterThanOrEqual(35);
      expect(data?.[1].distance_km).toBeLessThanOrEqual(36);
      expect(data?.[2].distance_km).toBeGreaterThanOrEqual(37);
      expect(data?.[2].distance_km).toBeLessThanOrEqual(39);
      expect(data?.every((row) => row.total_count === 3)).toBe(true);
    });

    it("a 10 km devuelve solo a P1", async () => {
      const { data } = await d1.rpc("search_players", { p_radius_km: 10 });

      expect(ids(data)).toEqual([P1]);
    });

    it("filtra por posición", async () => {
      const { data } = await d1.rpc("search_players", {
        p_radius_km: 50,
        p_position: "mediocampista",
      });

      expect(ids(data)).toEqual([P3]);
    });

    it("calcula partidos jugados y edad, con 0 y null cuando no hay datos", async () => {
      const { data } = await d1.rpc("search_players", { p_radius_km: 50 });
      const byId = new Map((data ?? []).map((row) => [row.player_id, row]));

      expect(byId.get(P1)?.matches_played).toBe(3);
      expect(byId.get(P1)?.age).toBe(25);
      expect(byId.get(P3)?.matches_played).toBe(0);
      expect(byId.get(P3)?.age).toBeNull();
    });

    // Reemplaza a los criterios con `search_players(300)`, que contradicen el
    // tope de 200 km del requisito 5 (ver la PR). Rosario queda a 232,7 km:
    // P4 y P7 nunca entran. P6 no tiene coordenadas.
    it("al tope de 200 km deja afuera a Rosario y a quien no tiene coordenadas", async () => {
      const { data } = await d1.rpc("search_players", { p_radius_km: 200 });

      expect(ids(data)).toEqual([P1, P2, P3]);
      expect(ids(data)).not.toContain(P4);
      expect(ids(data)).not.toContain(P7);
      expect(ids(data)).not.toContain(P6);
    });

    it("sin arqueros dentro de 200 km, la búsqueda por arquero da vacío", async () => {
      const { data, error } = await d1.rpc("search_players", {
        p_radius_km: 200,
        p_position: "arquero",
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("incluyendo a los que no buscan equipo, el total es 29 y la página trae 20", async () => {
      const { data } = await d1.rpc("search_players", {
        p_radius_km: 50,
        p_seeking_only: false,
      });

      expect(data).toHaveLength(20);
      expect(data?.[0].total_count).toBe(29);
    });

    it("pagina de forma estable: P1 y P2, después P3, después nada", async () => {
      const page = (offset: number) =>
        d1.rpc("search_players", { p_radius_km: 50, p_limit: 2, p_offset: offset });

      const [first, second, third] = await Promise.all([page(0), page(2), page(3)]);

      expect(ids(first.data)).toEqual([P1, P2]);
      expect(first.data?.[0].total_count).toBe(3);
      expect(ids(second.data)).toEqual([P3]);
      expect(second.data?.[0].total_count).toBe(3);
      expect(third.data).toEqual([]);
    });

    it("devuelve exactamente las 11 columnas, sin datos privados", async () => {
      const { data } = await d1.rpc("search_players", { p_radius_km: 10 });

      expect(Object.keys(data?.[0] ?? {}).sort()).toEqual(
        [
          "player_id",
          "full_name",
          "avatar_path",
          "position",
          "age",
          "city",
          "province",
          "matches_played",
          "is_seeking_team",
          "distance_km",
          "total_count",
        ].sort(),
      );
    });
  });

  describe("parámetros inválidos", () => {
    it.each([
      ["radio 0", { p_radius_km: 0 }, "invalid_radius"],
      ["radio 201", { p_radius_km: 201 }, "invalid_radius"],
      ["radio 300", { p_radius_km: 300 }, "invalid_radius"],
      ["posición portero", { p_radius_km: 50, p_position: "portero" }, "invalid_position"],
      ["límite 51", { p_radius_km: 50, p_limit: 51 }, "invalid_limit"],
      ["offset -1", { p_radius_km: 50, p_offset: -1 }, "invalid_offset"],
    ])("%s falla con 22023 %s", async (_caso, args, message) => {
      const { error } = await d1.rpc("search_players", args);

      expect(error?.code).toBe("22023");
      expect(error?.message).toBe(message);
    });
  });

  describe("quién puede buscar", () => {
    it("D2, con el equipo sin coordenadas, recibe search_origin_missing", async () => {
      const { error } = await d2.rpc("search_players", { p_radius_km: 50 });

      expect(error?.code).toBe("P0001");
      expect(error?.message).toBe("search_origin_missing");
    });

    it("D3, sin equipo, recibe search_origin_missing", async () => {
      const { error } = await d3.rpc("search_players", { p_radius_km: 50 });

      expect(error?.code).toBe("P0001");
      expect(error?.message).toBe("search_origin_missing");
    });

    it("un jugador recibe search_delegates_only", async () => {
      const { error } = await p1.rpc("search_players", { p_radius_km: 50 });

      expect(error?.code).toBe("42501");
      expect(error?.message).toBe("search_delegates_only");
    });

    // El rol se valida antes que los parámetros: un jugador no tiene que
    // enterarse de qué parámetros serían válidos.
    it("un jugador recibe search_delegates_only aunque el radio sea inválido", async () => {
      const { error } = await p1.rpc("search_players", { p_radius_km: 0 });

      expect(error?.message).toBe("search_delegates_only");
    });

    it("sin sesión no se puede ejecutar la función", async () => {
      const { error } = await anon.rpc("search_players", { p_radius_km: 50 });

      expect(error?.code).toBe("42501");
    });
  });

  // De punta a punta: el helper de la app contra la función real.
  describe("searchPlayers contra la base", () => {
    it("devuelve filas y total para D1", async () => {
      const result = await searchPlayers(d1, { radius: 50 });

      expect(result.ok && ids(result.rows)).toEqual([P1, P2, P3]);
      expect(result.ok && result.total).toBe(3);
    });

    it("traduce el equipo sin ubicación a origin_missing", async () => {
      await expect(searchPlayers(d2, { radius: 50 })).resolves.toEqual({
        ok: false,
        reason: "origin_missing",
      });
    });

    it("traduce la cuenta de jugador a delegates_only", async () => {
      await expect(searchPlayers(p1, { radius: 50 })).resolves.toEqual({
        ok: false,
        reason: "delegates_only",
      });
    });
  });
});
