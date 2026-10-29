import { beforeAll, describe, expect, it } from "vitest";

import {
  getConversationSummary,
  getOrCreateConversation,
  listConversations,
  listMessages,
  markConversationRead,
  messageErrorKey,
  orderedPair,
  sendMessage,
} from "@/lib/data/messages";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// T14a · mensajería contra la base real.
//
// Dos tipos de caso, como en T10a, T11a y T13a:
//
// - Lecturas y rechazos van contra el seed (PJ1↔DE1, PJ2↔DE1): los criterios
//   son conteos y órdenes exactos, y un rechazo no escribe nada.
// - Las escrituras que funcionan van contra cuentas nuevas. Acá es obligatorio:
//   las conversaciones y los mensajes no se pueden borrar, así que crear
//   PJ3↔DE3 o marcar como leído PJ1↔DE1 dejaría el seed alterado para siempre
//   y la corrida siguiente fallaría.
const SEED_PASSWORD = "password123";

const PJ1 = "11111111-1111-4111-8111-111111111111";
const PJ2 = "22222222-2222-4222-8222-222222222222";
const DE1 = "66666666-6666-4666-8666-666666666666";
const PJ1_DE1 = "0e000001-0000-4000-8000-000000000134";
const PJ2_DE1 = "0e000002-0000-4000-8000-000000000134";

async function signIn(email: string): Promise<Client> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password: SEED_PASSWORD });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  }

  return client;
}

describe.skipIf(!IS_LOCAL)("T14a · mensajería", () => {
  let pj1: Client;
  let pj2: Client;
  let pj3: Client;
  let de1: Client;
  let anon: Client;
  // Un jugador y un delegado nuevos, con una conversación propia, para las
  // escrituras que funcionan.
  let player: TestUser;
  let delegate: TestUser;
  let fresh: string;

  beforeAll(async () => {
    [pj1, pj2, pj3, de1] = await Promise.all([
      signIn("lucia.fernandez@example.com"),
      signIn("martin.gomez@example.com"),
      signIn("sofia.ramirez@example.com"),
      signIn("delegado@example.com"),
    ]);
    anon = newClient();
    [player, delegate] = await Promise.all([signUpUser("player"), signUpUser("delegate")]);
    fresh = await getOrCreateConversation(player.client, delegate.id);
  });

  describe("conversations", () => {
    it("un participante crea la conversación con el par ordenado", async () => {
      const other = await signUpUser("delegate");
      const { data, error } = await player.client
        .from("conversations")
        .insert(orderedPair(player.id, other.id))
        .select("id, last_message_at")
        .single();

      expect(error).toBeNull();
      expect(data!.last_message_at).toBeNull();
    });

    it("la misma conversación dos veces: 23505, y getOrCreateConversation devuelve la existente", async () => {
      const { error } = await player.client
        .from("conversations")
        .insert(orderedPair(player.id, delegate.id));

      expect(error?.code).toBe("23505");
      expect(await getOrCreateConversation(player.client, delegate.id)).toBe(fresh);
      // Desde el otro lado también es la misma.
      expect(await getOrCreateConversation(delegate.client, player.id)).toBe(fresh);
    });

    it("con el seed, getOrCreateConversation encuentra la que ya existe", async () => {
      expect(await getOrCreateConversation(de1, PJ1)).toBe(PJ1_DE1);
    });

    it("con uno mismo: 23514 (selfConversation)", async () => {
      const { error } = await pj3
        .from("conversations")
        .insert({ user_a: "33333333-3333-4333-8333-333333333333", user_b: "33333333-3333-4333-8333-333333333333" });

      expect(error?.code).toBe("23514");
      expect(messageErrorKey(error)).toBe("selfConversation");
    });

    it("una conversación ajena (PJ3 entre PJ1 y DE1): 42501", async () => {
      const { error } = await pj3.from("conversations").insert({ user_a: PJ1, user_b: DE1 });

      expect(error?.code).toBe("42501");
      expect(messageErrorKey(error)).toBe("forbidden");
    });

    it("con una cuenta que no existe: 23503 (recipientNotFound)", async () => {
      const ghost = crypto.randomUUID();
      const { error } = await player.client.from("conversations").insert(orderedPair(player.id, ghost));

      expect(error?.code).toBe("23503");
      expect(messageErrorKey(error)).toBe("recipientNotFound");
    });

    it.each([
      ["DE1", () => de1, 2],
      ["PJ1", () => pj1, 1],
      ["PJ3", () => pj3, 0],
    ])("%s ve %i conversaciones del seed", async (_who, client, expected) => {
      const { data, error } = await client()
        .from("conversations")
        .select("id")
        .in("id", [PJ1_DE1, PJ2_DE1]);

      expect(error).toBeNull();
      expect(data).toHaveLength(expected);
    });
  });

  describe("messages", () => {
    it("PJ2 no ve los mensajes de PJ1↔DE1", async () => {
      const { data, error } = await pj2.from("messages").select("id").eq("conversation_id", PJ1_DE1);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("PJ1 no puede mandar a nombre de DE1: 42501", async () => {
      const { error } = await pj1
        .from("messages")
        .insert({ conversation_id: PJ1_DE1, sender_id: DE1, body: "suplantación" });

      expect(error).toBeNull();
    });

    it("PJ2 no puede escribir en PJ1↔DE1: 42501", async () => {
      const { error } = await pj2
        .from("messages")
        .insert({ conversation_id: PJ1_DE1, sender_id: PJ2, body: "hola" });

      expect(error?.code).toBe("42501");
    });

    it.each([
      ["solo espacios", "   "],
      ["2001 caracteres", "a".repeat(2001)],
    ])("un cuerpo de %s: 23514 (invalidBody)", async (_caso, body) => {
      const { error } = await player.client
        .from("messages")
        .insert({ conversation_id: fresh, sender_id: player.id, body });

      expect(error?.code).toBe("23514");
      expect(messageErrorKey(error)).toBe("invalidBody");
    });

    it("2000 caracteres funcionan", async () => {
      const { error } = await player.client
        .from("messages")
        .insert({ conversation_id: fresh, sender_id: player.id, body: "a".repeat(2000) });

      expect(error).toBeNull();
    });

    it("al mandar, last_message_at de la conversación es el created_at del mensaje", async () => {
      const message = await sendMessage(player.client, fresh, "  ¿Cuándo entrenan?  ");
      const { data } = await player.client
        .from("conversations")
        .select("last_message_at")
        .eq("id", fresh)
        .single();

      expect(message.body).toBe("¿Cuándo entrenan?");
      expect(new Date(data!.last_message_at!).getTime()).toBe(new Date(message.created_at).getTime());
    });

    it.each([
      ["read_at: un mensaje ya leído", { read_at: new Date().toISOString() }],
      ["created_at: una fecha inventada", { created_at: "2020-01-01T00:00:00Z" }],
      ["id: un id elegido", { id: crypto.randomUUID() }],
    ])("no se puede fijar %s (42501, sin grant)", async (_caso, extra) => {
      const { error } = await player.client.from("messages").insert({
        conversation_id: fresh,
        sender_id: player.id,
        body: "con una columna que pone la base",
        ...extra,
      });

      expect(error?.code).toBe("42501");
    });

    it.each([
      ["last_message_at", { last_message_at: new Date().toISOString() }],
      ["created_at", { created_at: "2020-01-01T00:00:00Z" }],
      ["id", { id: crypto.randomUUID() }],
    ])("en conversations tampoco se fija %s (42501, sin grant)", async (_caso, extra) => {
      const other = await signUpUser("delegate");
      const { error } = await player.client
        .from("conversations")
        .insert({ ...orderedPair(player.id, other.id), ...extra });

      expect(error?.code).toBe("42501");
    });

    // Lo que `btrim` no recorta: sin la regex del `check`, se guardaban y la
    // bandeja los mostraba como un último mensaje en blanco.
    it.each([
      ["un salto de línea", "\n"],
      ["un tab", "\t"],
      ["NBSP (U+00A0)", "\u00a0"],
      ["espacio ideográfico (U+3000)", "\u3000"],
      ["BOM (U+FEFF)", "\ufeff"],
      ["ancho cero (U+200B)", "\u200b"],
      ["una mezcla invisible", " \n\t\u00a0\u200b\ufeff"],
    ])("un cuerpo de solo %s: 23514 (invalidBody)", async (_caso, body) => {
      const { error } = await player.client
        .from("messages")
        .insert({ conversation_id: fresh, sender_id: player.id, body });

      expect(error?.code).toBe("23514");
      expect(messageErrorKey(error)).toBe("invalidBody");
    });

    it("un texto con espacios Unicode en el medio sí se guarda", async () => {
      const { error } = await player.client.from("messages").insert({
        conversation_id: fresh,
        sender_id: player.id,
        body: "hola\u00a0chau",
      });

      expect(error).toBeNull();
    });

    // El criterio dice "afecta 0 filas"; sin grant es 42501 (ver la PR).
    it("los mensajes propios no se modifican ni se borran: 42501", async () => {
      const update = await player.client.from("messages").update({ body: "x" }).eq("sender_id", player.id);
      const remove = await player.client.from("messages").delete().eq("sender_id", player.id);

      expect(update.error?.code).toBe("42501");
      expect(remove.error?.code).toBe("42501");
    });

    it("las conversaciones tampoco se modifican ni se borran: 42501", async () => {
      const update = await player.client
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", fresh);
      const remove = await player.client.from("conversations").delete().eq("id", fresh);

      expect(update.error?.code).toBe("42501");
      expect(remove.error?.code).toBe("42501");
    });
  });

  describe("mark_conversation_read", () => {
    it("marca lo recibido, devuelve cuántos, y la segunda vez 0", async () => {
      const reader = await signUpUser("player");
      const writer = await signUpUser("delegate");
      const conversation = await getOrCreateConversation(reader.client, writer.id);
      await sendMessage(writer.client, conversation, "Te escribimos por la vacante");
      // Lo propio no se cuenta como no leído.
      await sendMessage(reader.client, conversation, "¡Hola!");

      const before = await listConversations(reader.client);
      expect(before.find((c) => c.id === conversation)?.unread_count).toBe(1);

      expect(await markConversationRead(reader.client, conversation)).toBe(1);
      expect(await markConversationRead(reader.client, conversation)).toBe(0);

      const after = await listConversations(reader.client);
      expect(after.find((c) => c.id === conversation)?.unread_count).toBe(0);
    });

    it("PJ3 sobre PJ1↔DE1: devuelve 0 y no cambia nada", async () => {
      expect(await markConversationRead(pj3, PJ1_DE1)).toBe(0);

      // PJ1 sigue teniendo su no leído.
      const summaries = await listConversations(pj1);
      expect(summaries.find((c) => c.id === PJ1_DE1)?.unread_count).toBe(1);
    });
  });

  describe("listados", () => {
    it("DE1: PJ1 (hace 2 horas, sin no leídos) y después PJ2 (1 no leído)", async () => {
      const summaries = (await listConversations(de1)).filter((c) =>
        [PJ1_DE1, PJ2_DE1].includes(c.id),
      );

      expect(summaries.map((c) => [c.other.id, c.unread_count])).toEqual([
        [PJ1, 0],
        [PJ2, 1],
      ]);
      expect(summaries[0].last_message).toMatchObject({ sender_id: DE1 });
      expect(summaries[0].other).toMatchObject({ full_name: "Lucía Fernández", role: "player" });
    });

    it("PJ1: 1 conversación con 1 no leído", async () => {
      const summaries = await listConversations(pj1);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({ id: PJ1_DE1, unread_count: 1 });
      expect(summaries[0].other).toMatchObject({ id: DE1, role: "delegate" });
    });

    it("PJ3 no tiene conversaciones", async () => {
      expect(await listConversations(pj3)).toEqual([]);
    });

    it("la vista previa del último mensaje se recorta a 120 caracteres", async () => {
      await sendMessage(delegate.client, fresh, "b".repeat(300));
      const summary = (await listConversations(player.client)).find((c) => c.id === fresh);

      expect(summary!.last_message!.body).toHaveLength(120);
    });

    it("PJ1: los 3 mensajes de PJ1↔DE1, del más nuevo al más viejo", async () => {
      const messages = await listMessages(pj1, PJ1_DE1);

      expect(messages.map((m) => m.sender_id)).toEqual([DE1, PJ1, DE1]);
      const times = messages.map((m) => new Date(m.created_at).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it("listMessages pagina con before", async () => {
      const [newest] = await listMessages(pj1, PJ1_DE1, { limit: 1 });
      const older = await listMessages(pj1, PJ1_DE1, { before: newest });

      expect(older).toHaveLength(2);
      expect(older.every((m) => m.created_at < newest.created_at)).toBe(true);
    });

    it("con mensajes del mismo instante, la paginación no pierde ninguno", async () => {
      const reader = await signUpUser("player");
      const writer = await signUpUser("delegate");
      const conversation = await getOrCreateConversation(reader.client, writer.id);
      // Un solo insert: `now()` es la hora de la transacción, así que los tres
      // quedan con el mismo `created_at`.
      const { error } = await writer.client.from("messages").insert(
        ["uno", "dos", "tres"].map((body) => ({
          conversation_id: conversation,
          sender_id: writer.id,
          body,
        })),
      );
      expect(error).toBeNull();

      // El caso existe: los tres comparten el instante.
      const all = await listMessages(reader.client, conversation);
      expect(new Set(all.map((m) => m.created_at)).size).toBe(1);

      const seen: string[] = [];
      let page = await listMessages(reader.client, conversation, { limit: 1 });
      while (page.length > 0) {
        seen.push(page[0].body);
        page = await listMessages(reader.client, conversation, { limit: 1, before: page[0] });
      }

      expect([...seen].sort()).toEqual(["dos", "tres", "uno"]);
    });

    it("un ajeno lista 0 mensajes, sin error", async () => {
      expect(await listMessages(pj3, PJ1_DE1)).toEqual([]);
    });
  });

  // FUT-140: lo que decide el 404 del hilo.
  describe("getConversationSummary", () => {
    it("un participante recibe la conversación, con el otro y sus no leídos", async () => {
      const summary = await getConversationSummary(pj1, PJ1_DE1);

      expect(summary).toMatchObject({
        id: PJ1_DE1,
        other: { id: DE1, role: "delegate" },
        unread_count: 1,
      });
    });

    it("un ajeno recibe null, igual que con una conversación que no existe", async () => {
      expect(await getConversationSummary(pj2, PJ1_DE1)).toBeNull();
      expect(await getConversationSummary(pj1, crypto.randomUUID())).toBeNull();
    });
  });

  describe("sin sesión", () => {
    // El criterio dice "0 filas"; sin grant es 42501 (ver la PR).
    it.each([
      ["conversations", () => anon.from("conversations").select("*")],
      ["messages", () => anon.from("messages").select("*")],
      ["conversation_summaries", () => anon.from("conversation_summaries").select("*")],
    ])("%s: 42501", async (_table, query) => {
      const { data, error } = await query();

      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("mark_conversation_read: 42501", async () => {
      const { error } = await anon.rpc("mark_conversation_read", { p_conversation_id: PJ1_DE1 });

      expect(error?.code).toBe("42501");
    });
  });

  describe("seed", () => {
    it("existen las 2 conversaciones y los 4 mensajes", async () => {
      const { data: conversations } = await de1.from("conversations").select("id").in("id", [PJ1_DE1, PJ2_DE1]);
      const { data: messages } = await de1
        .from("messages")
        .select("id")
        .in("conversation_id", [PJ1_DE1, PJ2_DE1]);

      expect(conversations).toHaveLength(2);
      expect(messages).toHaveLength(4);
    });
  });
});
