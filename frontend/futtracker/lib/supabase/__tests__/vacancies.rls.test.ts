import { beforeAll, describe, expect, it } from "vitest";

import {
  createVacancy,
  listOpenVacancies,
  listTeamVacancies,
  setVacancyStatus,
  vacancyErrorKey,
} from "@/lib/data/vacancies";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// Dos tipos de caso, separados a propósito:
//
// - Lecturas y rechazos van contra el seed (E1-E3, V1-V4, DE1, DE2, PJ1):
//   los criterios de T10a son órdenes y conteos exactos sobre esas filas, y
//   un rechazo no escribe nada.
// - Las escrituras que funcionan van contra un delegado y un equipo nuevos en
//   cada corrida. Si cerraran V1 o agregaran vacantes a E1, dejarían el seed
//   alterado para los criterios de lectura y para la corrida siguiente.
const SEED_PASSWORD = "password123";

const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const E3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
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

async function createTeam(delegate: TestUser): Promise<string> {
  const { data, error } = await delegate.client
    .from("teams")
    .insert({ owner_id: delegate.id, name: `Equipo ${delegate.id.slice(0, 8)}` })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo crear el equipo: ${error.message}`);
  }

  return data.id;
}

function ids(rows: { id: string }[] | null) {
  return (rows ?? []).map((row) => row.id);
}

describe.skipIf(!IS_LOCAL)("RLS y reglas de vacancies", () => {
  let anon: Client;
  let de1: Client;
  let de2: Client;
  let pj1: Client;

  beforeAll(async () => {
    anon = newClient();
    [de1, de2, pj1] = await Promise.all([
      signIn("delegado@example.com"),
      signIn("mariana.acuna@example.com"),
      signIn("lucia.fernandez@example.com"),
    ]);
  });

  describe("lectura", () => {
    it("sin sesión no devuelve filas", async () => {
      const { data, error } = await anon.from("vacancies").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("con sesión se leen abiertas y cerradas", async () => {
      const { data } = await pj1
        .from("vacancies")
        .select("id")
        .in("id", [V1, V2, V3, V4]);

      expect(ids(data).sort()).toEqual([V1, V2, V3, V4].sort());
    });
  });

  describe("rechazos sobre el seed", () => {
    it("un delegado no publica en el equipo de otro", async () => {
      const { error } = await de1.from("vacancies").insert({
        team_id: E2,
        position: "arquero",
        modality: "futbol_11",
        level: "competitivo",
      });

      expect(error?.code).toBe("42501");
    });

    it("un jugador no publica vacantes", async () => {
      const { error } = await pj1.from("vacancies").insert({
        team_id: E1,
        position: "arquero",
        modality: "futbol_11",
        level: "competitivo",
      });

      expect(error?.code).toBe("42501");
    });

    it("sin sesión no se publica", async () => {
      const { error } = await anon.from("vacancies").insert({
        team_id: E1,
        position: "arquero",
        modality: "futbol_11",
        level: "competitivo",
      });

      expect(error?.code).toBe("42501");
    });

    it("no se abre una segunda vacante de una posición que ya tiene una abierta", async () => {
      const { error } = await de1.from("vacancies").insert({
        team_id: E1,
        position: "mediocampista",
        modality: "futbol_7",
        level: "recreativo",
      });

      expect(error?.code).toBe("23505");
      expect(error?.message).toContain("vacancies_one_open_per_position");
      expect(vacancyErrorKey(error)).toBe("duplicateOpenPosition");
    });

    it("el dueño de otro equipo no cambia el estado: afecta 0 filas", async () => {
      const { data, error } = await de2
        .from("vacancies")
        .update({ status: "closed" })
        .eq("id", V1)
        .select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it.each([
      ["la posición", { position: "delantero" }],
      ["la descripción", { description: "Otra descripción" }],
    ])("el dueño no puede cambiar %s: el trigger lo rechaza", async (_campo, cambio) => {
      const { error } = await de1.from("vacancies").update(cambio).eq("id", V1);

      expect(error?.code).toBe("23514");
      expect(error?.message).toBe("vacancy_fields_locked");
      expect(vacancyErrorKey(error)).toBe("fieldsLocked");
    });

    // El criterio dice "afecta 0 filas", pero sin `grant delete` el pedido
    // rebota antes con 42501, igual que el update de `player_highlights`
    // (T08a). Corrección propuesta en la PR.
    it("el dueño no puede borrar una vacante: se cierra, no se borra", async () => {
      const { error } = await de1.from("vacancies").delete().eq("id", V3);

      expect(error?.code).toBe("42501");
    });
  });

  describe("checks de la tabla", () => {
    let delegate: TestUser;
    let teamId: string;

    beforeAll(async () => {
      delegate = await signUpUser("delegate");
      teamId = await createTeam(delegate);
    });

    it.each([
      ["posición portero", { position: "portero" }],
      ["modalidad futbol_9", { modality: "futbol_9" }],
      ["nivel pro", { level: "pro" }],
      ["descripción de 281 caracteres", { description: "x".repeat(281) }],
    ])("rechaza %s", async (_caso, invalido) => {
      const { error } = await delegate.client.from("vacancies").insert({
        team_id: teamId,
        position: "arquero",
        modality: "futbol_11",
        level: "competitivo",
        ...invalido,
      });

      expect(error?.code).toBe("23514");
    });
  });

  describe("escrituras del dueño", () => {
    let delegate: TestUser;
    let teamId: string;

    beforeAll(async () => {
      delegate = await signUpUser("delegate");
      teamId = await createTeam(delegate);
    });

    it("publica una vacante en su equipo y nace abierta", async () => {
      const { data, error } = await delegate.client
        .from("vacancies")
        .insert({
          team_id: teamId,
          position: "delantero",
          modality: "futbol_11",
          level: "competitivo",
        })
        .select("status")
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe("open");
    });

    // La secuencia de los criterios 7, 8 y 9, sobre un equipo propio.
    it("una cerrada no bloquea abrir otra; reabrirla con otra abierta sí", async () => {
      const base = { team_id: teamId, modality: "futbol_11", level: "recreativo" };

      const closed = await delegate.client
        .from("vacancies")
        .insert({ ...base, position: "defensor" })
        .select("id")
        .single();
      await delegate.client
        .from("vacancies")
        .update({ status: "closed" })
        .eq("id", closed.data!.id);

      const reopenedAfterClose = await delegate.client
        .from("vacancies")
        .insert({ ...base, position: "defensor" });
      expect(reopenedAfterClose.error).toBeNull();

      const reopen = await delegate.client
        .from("vacancies")
        .update({ status: "open" })
        .eq("id", closed.data!.id);
      expect(reopen.error?.code).toBe("23505");
    });

    it("al borrar el equipo se borran sus vacantes, aunque no haya política de delete", async () => {
      const owner = await signUpUser("delegate");
      const ownTeam = await createTeam(owner);
      await owner.client.from("vacancies").insert({
        team_id: ownTeam,
        position: "arquero",
        modality: "futbol_7",
        level: "intermedio",
      });

      const { error } = await owner.client.from("teams").delete().eq("id", ownTeam);
      expect(error).toBeNull();

      const { data } = await owner.client
        .from("vacancies")
        .select("id")
        .eq("team_id", ownTeam);
      expect(data).toEqual([]);
    });
  });

  describe("helpers contra la base", () => {
    it("listOpenVacancies de E1: V2 y V1, con el total en 2", async () => {
      const { vacancies, total } = await listOpenVacancies(pj1, {
        teamIds: [E1],
        limit: 20,
        offset: 0,
      });

      expect(ids(vacancies)).toEqual([V2, V1]);
      expect(total).toBe(2);
      expect(vacancies[0].teams?.id).toBe(E1);
    });

    it("listOpenVacancies de E1 filtrada por arquero: solo V2", async () => {
      const { vacancies } = await listOpenVacancies(pj1, {
        teamIds: [E1],
        position: "arquero",
        limit: 20,
        offset: 0,
      });

      expect(ids(vacancies)).toEqual([V2]);
    });

    it("listOpenVacancies de E3, sin vacantes: vacío con total 0", async () => {
      await expect(
        listOpenVacancies(pj1, { teamIds: [E3], limit: 20, offset: 0 }),
      ).resolves.toEqual({ vacancies: [], total: 0 });
    });

    it("listTeamVacancies de E1: abiertas primero, V2, V1 y después V3", async () => {
      const vacancies = await listTeamVacancies(pj1, E1);

      expect(ids(vacancies)).toEqual([V2, V1, V3]);
    });

    it("setVacancyStatus sobre una vacante ajena falla como forbidden", async () => {
      await expect(setVacancyStatus(de2, V1, "closed")).rejects.toMatchObject({
        key: "forbidden",
      });
    });

    it("createVacancy publica en el equipo de la sesión", async () => {
      const delegate = await signUpUser("delegate");
      const teamId = await createTeam(delegate);

      const vacancy = await createVacancy(delegate.client, {
        position: "mediocampista",
        modality: "futbol_7",
        level: "intermedio",
        description: null,
      });

      expect(vacancy.team_id).toBe(teamId);
      expect(vacancy.status).toBe("open");
    });
  });
});
