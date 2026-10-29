import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateConversation: vi.fn(),
  sendMessage: vi.fn(),
  listMessages: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    // Como el de Next: corta la ejecución.
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

vi.mock("@/lib/data/messages", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/messages")>("@/lib/data/messages");
  return {
    ...actual,
    getOrCreateConversation: mocks.getOrCreateConversation,
    sendMessage: mocks.sendMessage,
    listMessages: mocks.listMessages,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const { loadOlderMessagesAction, sendMessageAction, startConversationAction } = await import(
  "../actions"
);

const OTHER = "66666666-6666-4666-8666-666666666666";
const CONVERSATION = "0e000001-0000-4000-8000-000000000134";
const CREATED_AT = "2026-10-28T18:00:00.123456+00:00";

function row(n: number) {
  return {
    id: `0f0000${String(n).padStart(2, "0")}-0000-4000-8000-000000000140`,
    conversation_id: CONVERSATION,
    sender_id: OTHER,
    body: `mensaje ${n}`,
    created_at: CREATED_AT,
    read_at: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startConversationAction", () => {
  it.each([["un id que no es uuid", "no-es-un-id"], ["nada", undefined], ["un número", 42]])(
    "con %s no va a la base",
    async (_caso, id) => {
      expect(await startConversationAction(id)).toEqual({ ok: false, error: "unexpected" });
      expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
    },
  );

  it("abre la conversación y redirige al hilo", async () => {
    mocks.getOrCreateConversation.mockResolvedValue(CONVERSATION);

    await expect(startConversationAction(OTHER)).rejects.toMatchObject({
      url: `/mensajes/${CONVERSATION}`,
    });
    expect(mocks.getOrCreateConversation).toHaveBeenCalledWith({}, OTHER);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mensajes");
  });

  it.each([
    [{ code: "23514", message: 'violates check constraint "conversations_ordered_pair"' }, "selfConversation"],
    [{ code: "23503", message: 'violates foreign key constraint "conversations_user_b_fkey"' }, "recipientNotFound"],
    // `forbidden` no tiene texto propio: la pantalla muestra el genérico.
    [{ code: "42501", message: "new row violates row-level security policy" }, "unexpected"],
    [new Error("fetch failed"), "unexpected"],
  ])("traduce el error a %s, sin redirigir", async (error, key) => {
    mocks.getOrCreateConversation.mockRejectedValue(error);

    expect(await startConversationAction(OTHER)).toEqual({ ok: false, error: key });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("sendMessageAction", () => {
  it.each([
    ["un id de conversación inválido", "no-es-un-id", "hola"],
    ["un cuerpo que no es texto", CONVERSATION, 42],
  ])("con %s no va a la base", async (_caso, id, body) => {
    expect(await sendMessageAction(id, body)).toEqual({ ok: false, error: "unexpected" });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["solo un caracter de ancho cero", "​"],
    ["2001 caracteres", "a".repeat(2001)],
  ])("un cuerpo %s es invalidBody, sin ir a la base", async (_caso, body) => {
    expect(await sendMessageAction(CONVERSATION, body)).toEqual({ ok: false, error: "invalidBody" });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("envía y revalida la bandeja y el hilo", async () => {
    mocks.sendMessage.mockResolvedValue({});

    expect(await sendMessageAction(CONVERSATION, "  hola  ")).toEqual({ ok: true });
    expect(mocks.sendMessage).toHaveBeenCalledWith({}, CONVERSATION, "  hola  ");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/mensajes");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/mensajes/${CONVERSATION}`);
  });

  it("un rechazo de la base no revalida y devuelve la clave", async () => {
    mocks.sendMessage.mockRejectedValue({ code: "42501", message: "row-level security" });

    expect(await sendMessageAction(CONVERSATION, "hola")).toEqual({ ok: false, error: "unexpected" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("loadOlderMessagesAction", () => {
  const CURSOR = { created_at: CREATED_AT, id: row(0).id };

  it.each([
    ["un id de conversación inválido", "no-es-un-id", CURSOR],
    ["un cursor de solo fecha (el formato viejo)", CONVERSATION, CREATED_AT],
    ["un cursor sin id", CONVERSATION, { created_at: CREATED_AT }],
    ["un cursor con fecha inválida", CONVERSATION, { created_at: "ayer", id: CURSOR.id }],
  ])("con %s no va a la base", async (_caso, id, cursor) => {
    expect(await loadOlderMessagesAction(id, cursor)).toEqual({ ok: false });
    expect(mocks.listMessages).not.toHaveBeenCalled();
  });

  it("pide 51 desde el cursor y devuelve 50 del más viejo al más nuevo, con hasMore", async () => {
    // La base los devuelve del más nuevo al más viejo.
    const rows = Array.from({ length: 51 }, (_, i) => row(51 - i));
    mocks.listMessages.mockResolvedValue(rows);

    const result = await loadOlderMessagesAction(CONVERSATION, CURSOR);

    expect(mocks.listMessages).toHaveBeenCalledWith({}, CONVERSATION, { before: CURSOR, limit: 51 });
    expect(result.ok && result.messages).toHaveLength(50);
    expect(result.ok && result.messages[0].body).toBe("mensaje 2");
    expect(result.ok && result.messages[49].body).toBe("mensaje 51");
    expect(result.ok && result.hasMore).toBe(true);
    // Solo los campos del hilo: nada de `read_at` ni `conversation_id`.
    expect(result.ok && Object.keys(result.messages[0]).sort()).toEqual(
      ["body", "created_at", "id", "sender_id"],
    );
  });

  it("con menos de 51, no hay más", async () => {
    mocks.listMessages.mockResolvedValue([row(2), row(1)]);

    const result = await loadOlderMessagesAction(CONVERSATION, CURSOR);

    expect(result).toEqual({ ok: true, messages: expect.any(Array), hasMore: false });
  });

  it("si la base falla, ok: false", async () => {
    mocks.listMessages.mockRejectedValue(new Error("caída"));

    expect(await loadOlderMessagesAction(CONVERSATION, CURSOR)).toEqual({ ok: false });
  });
});
