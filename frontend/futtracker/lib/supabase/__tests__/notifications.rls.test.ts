import { beforeAll, describe, expect, it } from "vitest";

import { applyToVacancy } from "@/lib/data/applications";
import { getOrCreateConversation, sendMessage } from "@/lib/data/messages";
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
  notificationErrorKey,
} from "@/lib/data/notifications";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// Como en T11a y T14a: lecturas y rechazos contra el seed, escrituras contra
// cuentas nuevas, porque los avisos no se borran y el seed quedaría alterado.
const SEED_PASSWORD = "password123";

const PJ1 = "11111111-1111-4111-8111-111111111111";
const PJ2 = "22222222-2222-4222-8222-222222222222";
const PJ3 = "33333333-3333-4333-8333-333333333333";
const DE1 = "66666666-6666-4666-8666-666666666666";
const V2 = "0a000002-0000-4000-8000-000000000120";
const PJ1_DE1 = "0e000001-0000-4000-8000-000000000134";
const PJ2_DE1 = "0e000002-0000-4000-8000-000000000134";
const DE1_UNREAD = "1a000002-0000-4000-8000-000000000142";

async function signIn(email: string): Promise<Client> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  }

  return client;
}

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

async function newTeamWithVacancy(): Promise<{ owner: TestUser; vacancyId: string }> {
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
    .insert({ team_id: team.data.id, position: "delantero", modality: "futbol_11", level: "competitivo" })
    .select("id")
    .single();

  if (vacancy.error) {
    throw new Error(`No se pudo crear la vacante: ${vacancy.error.message}`);
  }

  return { owner, vacancyId: vacancy.data.id };
}

describe.skipIf(!IS_LOCAL)("T15a · notificaciones", () => {
  let pj1: Client;
  let pj2: Client;
  let pj3: Client;
  let de1: Client;
  let de3: Client;
  let anon: Client;

  beforeAll(async () => {
    [pj1, pj2, pj3, de1, de3] = await Promise.all([
      signIn("lucia.fernandez@example.com"),
      signIn("martin.gomez@example.com"),
      signIn("sofia.ramirez@example.com"),
      signIn("delegado@example.com"),
      signIn("gustavo.ledesma@example.com"),
    ]);
    anon = newClient();
  });

  describe("seed", () => {
    it.each([
      ["DE1", () => de1, 2],
      ["PJ1", () => pj1, 1],
      ["PJ3", () => pj3, 0],
      ["DE3", () => de3, 0],
    ])("%s ve %i notificaciones", async (_who, client, expected) => {
      const { data, error } = await client().from("notifications").select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(expected);
    });

    it("PJ1: un new_message sin leer de DE1 en PJ1↔DE1", async () => {
      const [notification] = await listNotifications(pj1);

      expect(notification).toMatchObject({
        type: "new_message",
        conversation_id: PJ1_DE1,
        vacancy_id: null,
        read_at: null,
        actor: { id: DE1, full_name: "Carlos Delegado" },
      });
    });

    it("DE1: el mensaje de PJ2 sin leer y después la postulación de PJ3, ya leída", async () => {
      const notifications = await listNotifications(de1);

      expect(notifications.map((n) => [n.type, n.actor?.id, n.read_at === null])).toEqual([
        ["new_message", PJ2, true],
        ["new_application", PJ3, false],
      ]);
      expect(notifications[0].conversation_id).toBe(PJ2_DE1);
      expect(notifications[1]).toMatchObject({ vacancy_id: V2, vacancy_position: "arquero" });
    });

    it.each([
      ["DE1", () => de1, 1],
      ["PJ1", () => pj1, 1],
      ["PJ3", () => pj3, 0],
    ])("%s tiene %i sin leer", async (_who, client, expected) => {
      expect(await countUnreadNotifications(client())).toBe(expected);
    });

    it("listNotifications pagina con before", async () => {
      const [newest] = await listNotifications(de1, { limit: 1 });
      const older = await listNotifications(de1, { before: newest.created_at });

      expect(newest.type).toBe("new_message");
      expect(older.map((n) => n.type)).toEqual(["new_application"]);
    });
  });

  describe("privacidad", () => {
    it("PJ2 filtrando por el user_id de DE1 ve 0 filas", async () => {
      const { data, error } = await pj2.from("notifications").select("id").eq("user_id", DE1);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("PJ1 no puede crearse un aviso: 42501", async () => {
      const { error } = await pj1
        .from("notifications")
        .insert({ user_id: PJ1, type: "new_message", conversation_id: PJ1_DE1 });

      expect(error?.code).toBe("42501");
      expect(notificationErrorKey(error)).toBe("forbidden");
    });

    // El criterio dice "afecta 0 filas"; sin grant es 42501, como en T14a (ver la PR).
    it("PJ1 no puede modificar ni borrar avisos: 42501", async () => {
      const update = await pj1.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", PJ1);
      const remove = await pj1.from("notifications").delete().eq("user_id", PJ1);

      expect(update.error?.code).toBe("42501");
      expect(remove.error?.code).toBe("42501");
    });

    it("PJ3 marcando un aviso de DE1 devuelve 0 y DE1 sigue con 1 sin leer", async () => {
      expect(await markNotificationsRead(pj3, [DE1_UNREAD])).toBe(0);
      expect(await countUnreadNotifications(de1)).toBe(1);
    });

    it("sin sesión: 0 filas", async () => {
      const { data, error } = await anon.from("notifications").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("sin sesión, mark_notifications_read: 42501", async () => {
      const { error } = await anon.rpc("mark_notifications_read", {});

      expect(error?.code).toBe("42501");
    });
  });

  describe("mensaje nuevo", () => {
    let player: TestUser;
    let delegate: TestUser;
    let conversation: string;

    beforeAll(async () => {
      [player, delegate] = await Promise.all([signUpUser("player"), signUpUser("delegate")]);
      conversation = await getOrCreateConversation(delegate.client, player.id);
    });

    it("avisa al destinatario, agrupa por conversación y nunca al remitente", async () => {
      await sendMessage(delegate.client, conversation, "¿Te sumás el martes?");

      let notifications = await listNotifications(player.client);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: "new_message",
        conversation_id: conversation,
        read_at: null,
        actor: { id: delegate.id },
      });

      await sendMessage(delegate.client, conversation, "Avisame");
      expect(await countUnreadNotifications(player.client)).toBe(1);
      expect(await listNotifications(player.client)).toHaveLength(1);

      await sendMessage(player.client, conversation, "¡Dale!");
      expect(await listNotifications(player.client)).toHaveLength(1);
      expect(await countUnreadNotifications(delegate.client)).toBe(1);

      await markNotificationsRead(player.client);
      await sendMessage(delegate.client, conversation, "Te esperamos");

      notifications = await listNotifications(player.client);
      expect(notifications).toHaveLength(2);
      expect(notifications.filter((n) => n.read_at === null)).toHaveLength(1);
    });
  });

  describe("postulación nueva", () => {
    it("avisa al delegado dueño del equipo y no al jugador", async () => {
      const [player, { owner, vacancyId }] = await Promise.all([newPlayer(), newTeamWithVacancy()]);

      await applyToVacancy(player.client, vacancyId);

      const notifications = await listNotifications(owner.client);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: "new_application",
        vacancy_id: vacancyId,
        conversation_id: null,
        vacancy_position: "delantero",
        actor: { id: player.id },
      });
      expect(await listNotifications(player.client)).toEqual([]);
    });

    it("retirarse y volver a postularse no suma otro aviso sin leer", async () => {
      const [player, { owner, vacancyId }] = await Promise.all([newPlayer(), newTeamWithVacancy()]);

      for (let i = 0; i < 3; i++) {
        const application = await applyToVacancy(player.client, vacancyId);
        await player.client.from("vacancy_applications").delete().eq("id", application.id);
      }

      expect(await countUnreadNotifications(owner.client)).toBe(1);
    });
  });

  describe("mark_notifications_read", () => {
    it("marca las propias, devuelve cuántas, y la segunda vez 0", async () => {
      const [reader, first, second] = await Promise.all([
        signUpUser("player"),
        signUpUser("delegate"),
        signUpUser("delegate"),
      ]);
      for (const writer of [first, second]) {
        const conversation = await getOrCreateConversation(writer.client, reader.id);
        await sendMessage(writer.client, conversation, "Hola");
      }

      const [one] = await listNotifications(reader.client);
      expect(await markNotificationsRead(reader.client, [one.id])).toBe(1);
      expect(await countUnreadNotifications(reader.client)).toBe(1);

      expect(await markNotificationsRead(reader.client)).toBe(1);
      expect(await countUnreadNotifications(reader.client)).toBe(0);
      expect(await markNotificationsRead(reader.client)).toBe(0);
    });
  });
});
