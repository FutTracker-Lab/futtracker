import { beforeAll, describe, expect, it } from "vitest";

import {
  followErrorKey,
  followTeam,
  getFollowerCount,
  isFollowing,
  listFollowedTeams,
  listTeamFollowers,
} from "@/lib/data/follows";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// Mismo criterio que `vacancies.rls.test.ts`:
//
// - Lecturas y rechazos van contra el seed (PJ1-PJ3, DE1-DE3, E1-E3): los
//   criterios de T13a son conteos y órdenes exactos sobre esas filas, y un
//   rechazo no escribe nada.
// - Las escrituras que funcionan van contra un jugador y un equipo nuevos. Si
//   PJ3 siguiera a E1 o DE1 borrara E1, el seed quedaría alterado para los
//   criterios de lectura y para la corrida siguiente.
//
// El jugador nuevo de `signUpUser` no tiene ficha en `players`: eso prueba de
// paso el supuesto 2 (seguir no exige el perfil completo).
const SEED_PASSWORD = "password123";

const PJ1 = "11111111-1111-4111-8111-111111111111";
const PJ2 = "22222222-2222-4222-8222-222222222222";
const DE1 = "66666666-6666-4666-8666-666666666666";
const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const E3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NO_TEAM = "00000000-0000-4000-8000-000000000000";

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

async function newTeam(): Promise<{ owner: TestUser; teamId: string }> {
  const owner = await signUpUser("delegate");
  const { data, error } = await owner.client
    .from("teams")
    .insert({ owner_id: owner.id, name: `Equipo ${owner.id.slice(0, 8)}` })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo crear el equipo: ${error.message}`);
  }

  return { owner, teamId: data.id };
}

describe.skipIf(!IS_LOCAL)("RLS y reglas de team_follows", () => {
  let anon: Client;
  let de1: Client;
  let de2: Client;
  let de3: Client;
  let pj1: Client;
  let pj3: Client;

  beforeAll(async () => {
    anon = newClient();
    [de1, de2, de3, pj1, pj3] = await Promise.all([
      signIn("delegado@example.com"),
      signIn("mariana.acuna@example.com"),
      signIn("gustavo.ledesma@example.com"),
      signIn("lucia.fernandez@example.com"),
      signIn("sofia.ramirez@example.com"),
    ]);
  });

  describe("quién ve qué (seed)", () => {
    it("PJ1 ve sus 2 seguimientos (E1 y E2) y ninguno de PJ2", async () => {
      const { data } = await pj1.from("team_follows").select("follower_id, team_id");

      expect((data ?? []).map((row) => row.team_id).sort()).toEqual([E1, E2].sort());
      expect(data?.every((row) => row.follower_id === PJ1)).toBe(true);
    });

    it("DE1 ve los 2 seguidores de E1 (PJ1 y PJ2)", async () => {
      const { data } = await de1.from("team_follows").select("follower_id, team_id");

      expect(data?.every((row) => row.team_id === E1)).toBe(true);
      expect((data ?? []).map((row) => row.follower_id).sort()).toEqual([PJ1, PJ2].sort());
    });

    it("DE2 ve solo a PJ1 siguiendo a E2", async () => {
      const { data } = await de2.from("team_follows").select("follower_id, team_id");

      expect(data).toEqual([{ follower_id: PJ1, team_id: E2 }]);
    });

    it("DE3 no ve nada: E3 no tiene seguidores", async () => {
      const { data } = await de3.from("team_follows").select("team_id");

      expect(data).toEqual([]);
    });

    it("PJ3 no ve quién sigue a E1", async () => {
      const { data } = await pj3.from("team_follows").select("team_id").eq("team_id", E1);

      expect(data).toEqual([]);
    });

    it("sin sesión no devuelve filas", async () => {
      const { data, error } = await anon.from("team_follows").select("team_id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("contador", () => {
    // El número es visible para cualquiera con sesión, aunque PJ3 no pueda ver
    // ninguna de esas filas.
    it.each([
      ["E1", E1, 2],
      ["E2", E2, 1],
      ["E3", E3, 0],
      ["un equipo que no existe", NO_TEAM, 0],
    // Un `%s` por argumento, en orden: con `%i` en el segundo lugar, el título
    // tomaba el uuid del equipo y mostraba "NaN" (observación de QA).
    ])("PJ3 ve el número de %s (%s): %i", async (_caso, teamId, count) => {
      await expect(getFollowerCount(pj3, teamId)).resolves.toBe(count);
    });

    it("sin sesión no se puede llamar a la función", async () => {
      const { error } = await anon.rpc("team_follower_count", { p_team_id: E1 });

      expect(error?.code).toBe("42501");
    });
  });

  describe("rechazos (seed)", () => {
    it("un jugador no sigue a nombre de otro", async () => {
      const { data: user } = await pj3.auth.getUser();
      const { error } = await pj3
        .from("team_follows")
        .insert({ follower_id: PJ1, team_id: E3 });

      expect(user.user).not.toBeNull();
      expect(error?.code).toBe("42501");
    });

    it("un delegado no sigue equipos", async () => {
      const { error } = await de1
        .from("team_follows")
        .insert({ follower_id: DE1, team_id: E2 });

      expect(error?.code).toBe("42501");
      expect(followErrorKey(error)).toBe("forbidden");
    });

    it("un equipo que no existe rebota en la foránea", async () => {
      const { data: user } = await pj3.auth.getUser();
      const { error } = await pj3
        .from("team_follows")
        .insert({ follower_id: user.user!.id, team_id: NO_TEAM });

      expect(error?.code).toBe("23503");
      expect(followErrorKey(error)).toBe("teamNotFound");
    });

    it("sin sesión no se sigue", async () => {
      const { error } = await anon
        .from("team_follows")
        .insert({ follower_id: PJ1, team_id: E3 });

      expect(error?.code).toBe("42501");
    });

    // El criterio dice "afecta 0 filas", pero sin `grant update` el pedido
    // rebota antes con 42501, como en T08a, T10a, T11a y T09c. Corrección
    // propuesta en la PR.
    it("un seguimiento no se modifica", async () => {
      const { error } = await pj1
        .from("team_follows")
        .update({ created_at: new Date().toISOString() })
        .eq("follower_id", PJ1);

      expect(error?.code).toBe("42501");
    });

    it("no se borra el seguimiento de otro: afecta 0 filas", async () => {
      const { data, error } = await pj1
        .from("team_follows")
        .delete()
        .eq("follower_id", PJ2)
        .eq("team_id", E1)
        .select("team_id");

      expect(error).toBeNull();
      expect(data).toEqual([]);

      // PJ1 no puede ver la fila de PJ2 para releerla, pero el contador sí la
      // cuenta: si el delete la hubiera borrado, E1 tendría 1 seguidor.
      await expect(getFollowerCount(pj1, E1)).resolves.toBe(2);
    });
  });

  describe("escrituras (jugador y equipo nuevos)", () => {
    it("sigue, no puede repetir, el contador sube, y deja de seguir", async () => {
      const { teamId } = await newTeam();
      const player = await signUpUser("player");

      await expect(getFollowerCount(player.client, teamId)).resolves.toBe(0);

      await followTeam(player.client, teamId);
      await expect(getFollowerCount(player.client, teamId)).resolves.toBe(1);
      await expect(isFollowing(player.client, teamId)).resolves.toBe(true);

      await expect(followTeam(player.client, teamId)).rejects.toMatchObject({ code: "23505" });

      const { data } = await player.client
        .from("team_follows")
        .delete()
        .eq("follower_id", player.id)
        .eq("team_id", teamId)
        .select("team_id");
      expect(data).toHaveLength(1);
      await expect(isFollowing(player.client, teamId)).resolves.toBe(false);
    });

    it("el dueño ve al seguidor, con posición y ciudad en null si no tiene ficha", async () => {
      const { owner, teamId } = await newTeam();
      const player = await signUpUser("player");
      await followTeam(player.client, teamId);

      const followers = await listTeamFollowers(owner.client, teamId);

      expect(followers).toHaveLength(1);
      expect(followers[0]).toMatchObject({
        follower_id: player.id,
        position: null,
        city: null,
      });
    });

    it("al borrar el equipo se borran sus seguimientos", async () => {
      const { owner, teamId } = await newTeam();
      const player = await signUpUser("player");
      await followTeam(player.client, teamId);

      const { error } = await owner.client.from("teams").delete().eq("id", teamId);
      expect(error).toBeNull();

      await expect(isFollowing(player.client, teamId)).resolves.toBe(false);
    });
  });

  describe("helpers contra el seed", () => {
    it("listFollowedTeams de PJ1: E2 y después E1", async () => {
      const teams = await listFollowedTeams(pj1);

      expect(teams.map((team) => team.id)).toEqual([E2, E1]);
      expect(Object.keys(teams[0]).sort()).toEqual(
        ["category", "city", "crest_path", "id", "name", "province"].sort(),
      );
    });

    it("listTeamFollowers de E1 para DE1: PJ2 y después PJ1, con los datos de su ficha", async () => {
      const followers = await listTeamFollowers(de1, E1);

      expect(followers.map((row) => row.follower_id)).toEqual([PJ2, PJ1]);
      expect(followers[0]).toMatchObject({ full_name: "Martín Gómez", position: "arquero" });
      expect(followers[1]).toMatchObject({ full_name: "Lucía Fernández", position: "delantero" });
    });

    // La RLS le muestra a PJ1 su propia fila de E1; la función igual no le
    // devuelve nada porque no es el dueño.
    it("a un seguidor que no es el dueño, listTeamFollowers no le devuelve nada", async () => {
      await expect(listTeamFollowers(pj1, E1)).resolves.toEqual([]);
    });

    it("isFollowing: PJ1 sigue a E1, PJ3 no", async () => {
      await expect(isFollowing(pj1, E1)).resolves.toBe(true);
      await expect(isFollowing(pj3, E1)).resolves.toBe(false);
    });
  });
});
