import { beforeAll, describe, expect, it } from "vitest";

import {
  applicationErrorKey,
  applyToVacancy,
  countApplicationsByVacancy,
  listMyApplications,
  listVacancyApplications,
  withdrawApplication,
} from "@/lib/data/applications";
import { listOpenVacancies } from "@/lib/data/vacancies";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// Mismo criterio que `vacancies.rls.test.ts`:
//
// - Lecturas y rechazos van contra el seed (PJ0-PJ3, DE1, DE2, V1-V4): los
//   criterios de T11a son conteos y órdenes exactos sobre esas filas, y un
//   rechazo no escribe nada.
// - Las escrituras que funcionan (postularse, retirarse, cerrar la vacante,
//   borrar el equipo) van contra un delegado, un equipo, una vacante y un
//   jugador nuevos en cada corrida. Hechas sobre el seed, cerrarían V1 o
//   cambiarían las postulaciones de PJ1, y los criterios de lectura dejarían de
//   cerrar.
const SEED_PASSWORD = "password123";

const PJ1 = "11111111-1111-4111-8111-111111111111";
const PJ2 = "22222222-2222-4222-8222-222222222222";
const DE1 = "66666666-6666-4666-8666-666666666666";
const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const E3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RELLENO_A = "c00000a0-0000-4000-8000-000000000123";
const RELLENO_B = "c00000b0-0000-4000-8000-000000000123";
const V1 = "0a000001-0000-4000-8000-000000000120";
const V2 = "0a000002-0000-4000-8000-000000000120";
const V3 = "0a000003-0000-4000-8000-000000000120";
const V4 = "0a000004-0000-4000-8000-000000000120";

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

// La ficha de `players` no la crea el alta: la exige la foránea.
async function newPlayer(): Promise<TestUser> {
  const player = await signUpUser("player");
  const { error } = await player.client
    .from("players")
    .insert({ id: player.id, position: "delantero" });

  if (error) {
    throw new Error(`No se pudo preparar la ficha: ${error.message}`);
  }

  return player;
}

async function newTeamWithVacancy(): Promise<{
  owner: TestUser;
  teamId: string;
  vacancyId: string;
}> {
  const owner = await signUpUser("delegate");
  const team = await owner.client
    .from("teams")
    .insert({ owner_id: owner.id, name: `Equipo ${owner.id.slice(0, 8)}` })
    .select("id")
    .single();

  if (team.error) {
    throw new Error(`No se pudo crear el equipo: ${team.error.message}`);
  }

  const vacancy = await owner.client
    .from("vacancies")
    .insert({
      team_id: team.data.id,
      position: "delantero",
      modality: "futbol_11",
      level: "competitivo",
    })
    .select("id")
    .single();

  if (vacancy.error) {
    throw new Error(`No se pudo crear la vacante: ${vacancy.error.message}`);
  }

  return { owner, teamId: team.data.id, vacancyId: vacancy.data.id };
}

describe.skipIf(!IS_LOCAL)("RLS y reglas de vacancy_applications", () => {
  let anon: Client;
  let de1: Client;
  let de2: Client;
  let pj0: Client;
  let pj1: Client;
  let pj3: Client;

  beforeAll(async () => {
    anon = newClient();
    [de1, de2, pj0, pj1, pj3] = await Promise.all([
      signIn("delegado@example.com"),
      signIn("mariana.acuna@example.com"),
      signIn("postulaciones.pj0@example.com"),
      signIn("lucia.fernandez@example.com"),
      signIn("sofia.ramirez@example.com"),
    ]);
  });

  describe("quién ve qué (seed)", () => {
    it("PJ1 ve sus 2 postulaciones (V1 y V4) y ninguna de PJ2", async () => {
      const { data } = await pj1.from("vacancy_applications").select("vacancy_id, player_id");

      expect((data ?? []).map((row) => row.vacancy_id).sort()).toEqual([V1, V4].sort());
      expect(data?.every((row) => row.player_id === PJ1)).toBe(true);
    });

    it("DE1 ve las 2 de V1 (PJ1 y PJ2) y ninguna de V4, que es de otro equipo", async () => {
      const { data } = await de1.from("vacancy_applications").select("vacancy_id, player_id");

      expect(data?.every((row) => row.vacancy_id === V1)).toBe(true);
      expect((data ?? []).map((row) => row.player_id).sort()).toEqual([PJ1, PJ2].sort());
    });

    it("DE2 ve solo la de PJ1 a V4", async () => {
      const { data } = await de2.from("vacancy_applications").select("vacancy_id, player_id");

      expect(data).toEqual([{ vacancy_id: V4, player_id: PJ1 }]);
    });

    it("PJ3 no ve las postulaciones de otros a V1", async () => {
      const { data } = await pj3
        .from("vacancy_applications")
        .select("id")
        .eq("vacancy_id", V1);

      expect(data).toEqual([]);
    });

    it("sin sesión no devuelve filas", async () => {
      const { data, error } = await anon.from("vacancy_applications").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("rechazos (seed)", () => {
    it("un jugador no se postula a nombre de otro", async () => {
      const { error } = await pj3
        .from("vacancy_applications")
        .insert({ vacancy_id: V2, player_id: PJ1 });

      expect(error?.code).toBe("42501");
      expect(applicationErrorKey(error)).toBe("forbidden");
    });

    it("no se postula a una vacante cerrada", async () => {
      const { data: user } = await pj3.auth.getUser();
      const { error } = await pj3
        .from("vacancy_applications")
        .insert({ vacancy_id: V3, player_id: user.user!.id });

      expect(error?.code).toBe("23514");
      expect(error?.message).toBe("vacancy_closed");
      expect(applicationErrorKey(error)).toBe("vacancyClosed");
    });

    it("una cuenta de jugador sin perfil rebota en la foránea", async () => {
      const { data: user } = await pj0.auth.getUser();
      const { error } = await pj0
        .from("vacancy_applications")
        .insert({ vacancy_id: V2, player_id: user.user!.id });

      expect(error?.code).toBe("23503");
      expect(applicationErrorKey(error)).toBe("profileIncomplete");
    });

    // La RLS se evalúa antes que la foránea: con su propio id pasa la RLS y
    // rebota en la foránea; con el de otro rebota en la RLS.
    it("un delegado con su propio id rebota en la foránea", async () => {
      const { error } = await de1
        .from("vacancy_applications")
        .insert({ vacancy_id: V2, player_id: DE1 });

      expect(error?.code).toBe("23503");
    });

    it("un delegado con el id de un jugador rebota en la RLS", async () => {
      const { error } = await de1
        .from("vacancy_applications")
        .insert({ vacancy_id: V2, player_id: PJ1 });

      expect(error?.code).toBe("42501");
    });

    it("sin sesión no se postula", async () => {
      const { error } = await anon
        .from("vacancy_applications")
        .insert({ vacancy_id: V2, player_id: PJ1 });

      expect(error?.code).toBe("42501");
    });

    // El criterio dice "afecta 0 filas", pero sin `grant update` el pedido
    // rebota antes con 42501, como el update de `player_highlights` (T08a) y
    // el delete de `vacancies` (T10a). Corrección propuesta en la PR.
    it("una postulación no se modifica", async () => {
      const { error } = await pj1
        .from("vacancy_applications")
        .update({ vacancy_id: V2 })
        .eq("player_id", PJ1);

      expect(error?.code).toBe("42501");
    });

    it("no se borra la postulación de otro: afecta 0 filas", async () => {
      const player = await newPlayer();
      const { data, error } = await player.client
        .from("vacancy_applications")
        .delete()
        .eq("player_id", PJ2)
        .select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("escrituras (equipo, vacante y jugador nuevos)", () => {
    it("se postula, no puede repetir, se retira y se vuelve a postular", async () => {
      const { vacancyId } = await newTeamWithVacancy();
      const player = await newPlayer();

      const first = await applyToVacancy(player.client, vacancyId);
      expect(first.player_id).toBe(player.id);

      await expect(applyToVacancy(player.client, vacancyId)).rejects.toMatchObject({
        code: "23505",
      });

      const { data: deleted } = await player.client
        .from("vacancy_applications")
        .delete()
        .eq("id", first.id)
        .select("id");
      expect(deleted).toHaveLength(1);

      await expect(applyToVacancy(player.client, vacancyId)).resolves.toMatchObject({
        player_id: player.id,
      });
    });

    it("cerrar la vacante no toca las postulaciones ya hechas", async () => {
      const { owner, teamId, vacancyId } = await newTeamWithVacancy();
      const [a, b] = await Promise.all([newPlayer(), newPlayer()]);
      await applyToVacancy(a.client, vacancyId);
      await applyToVacancy(b.client, vacancyId);

      await owner.client.from("vacancies").update({ status: "closed" }).eq("id", vacancyId);

      const counts = await countApplicationsByVacancy(owner.client, teamId);
      expect(counts[vacancyId]).toBe(2);
    });

    it("al borrar el equipo se borran las postulaciones a sus vacantes", async () => {
      const { owner, teamId, vacancyId } = await newTeamWithVacancy();
      const player = await newPlayer();
      await applyToVacancy(player.client, vacancyId);

      const { error } = await owner.client.from("teams").delete().eq("id", teamId);
      expect(error).toBeNull();

      const { data } = await player.client
        .from("vacancy_applications")
        .select("id")
        .eq("vacancy_id", vacancyId);
      expect(data).toEqual([]);
    });

    it("withdrawApplication sobre una postulación ajena falla como notFound", async () => {
      const player = await newPlayer();

      await expect(
        withdrawApplication(player.client, "0c000002-0000-4000-8000-000000000123"),
      ).rejects.toMatchObject({ key: "notFound" });
    });
  });

  describe("helpers contra el seed", () => {
    it("listVacancyApplications de V1 para DE1: PJ1 y después PJ2, con edad y sin birth_date", async () => {
      const rows = await listVacancyApplications(de1, { teamId: E1, vacancyId: V1 });

      expect(rows.map((row) => row.player_id)).toEqual([PJ1, PJ2]);
      expect(rows.every((row) => typeof row.age === "number")).toBe(true);
      expect(rows.some((row) => "birth_date" in row)).toBe(false);
    });

    it("sin vacancyId devuelve las mismas 2: V2 y V3 no tienen postulaciones", async () => {
      const rows = await listVacancyApplications(de1, { teamId: E1 });

      expect(rows.map((row) => row.player_id)).toEqual([PJ1, PJ2]);
    });

    it("DE2 no ve las postulaciones del equipo de DE1", async () => {
      await expect(
        listVacancyApplications(de2, { teamId: E1, vacancyId: V1 }),
      ).resolves.toEqual([]);
    });

    it("listMyApplications de PJ1: V1 y después V4, con el equipo adentro", async () => {
      const rows = await listMyApplications(pj1);

      expect(rows.map((row) => row.vacancy.id)).toEqual([V1, V4]);
      expect(rows[0].vacancy.team.id).toBe(E1);
      expect(rows[1].vacancy.team.id).toBe(E2);
    });

    it("countApplicationsByVacancy de E1: V1 con 2, V2 y V3 con 0", async () => {
      await expect(countApplicationsByVacancy(de1, E1)).resolves.toEqual({
        [V1]: 2,
        [V2]: 0,
        [V3]: 0,
      });
    });

    // El criterio llama sin `teamIds`. Acá se acota a los equipos del seed:
    // otros tests de RLS publican vacantes en equipos nuevos durante la misma
    // corrida, y el total de toda la base dejaría de ser 11.
    it("listOpenVacancies con el relleno: 10 filas en la primera página, total 11", async () => {
      const { vacancies, total } = await listOpenVacancies(pj1, {
        teamIds: [E1, E2, E3, RELLENO_A, RELLENO_B],
        limit: 10,
        offset: 0,
      });

      expect(vacancies).toHaveLength(10);
      expect(total).toBe(11);
    });
  });
});
