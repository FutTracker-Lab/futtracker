import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  MessageError,
  getOrCreateConversation,
  messageErrorKey,
  normalizeMessageBody,
  orderedPair,
  sendMessage,
} from "@/lib/data/messages";
import type { Database } from "@/lib/supabase/database.types";

const PJ1 = "11111111-1111-4111-8111-111111111111";
const DE1 = "66666666-6666-4666-8666-666666666666";
const CONVERSATION = "0e000001-0000-4000-8000-000000000134";

type Result = { data: unknown; error: { code: string; message: string } | null };

/**
 * Cliente falso con `auth.getUser()` y un `from()` que encadena todo y
 * resuelve, en orden, los resultados que se le pasan: el primer `await` recibe
 * el primero, el segundo el segundo. Registra cada llamada para poder mirar
 * qué se mandó.
 */
function fakeClient(userId: string | null, results: Result[]) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  let next = 0;

  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };

    for (const method of ["insert", "select", "eq", "single", "order", "limit", "lt"]) {
      chain[method] = record(method);
    }

    chain.then = (resolve: (value: Result) => unknown) => resolve(results[next++]);

    return chain;
  });

  const client = {
    from,
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

describe("orderedPair", () => {
  it("deja primero el id menor, venga en el orden que venga", () => {
    expect(orderedPair(DE1, PJ1)).toEqual({ user_a: PJ1, user_b: DE1 });
    expect(orderedPair(PJ1, DE1)).toEqual({ user_a: PJ1, user_b: DE1 });
  });

  it("ordena como Postgres: los dígitos antes que las letras", () => {
    const withDigit = "9fffffff-0000-4000-8000-000000000000";
    const withLetter = "a0000000-0000-4000-8000-000000000000";

    expect(orderedPair(withLetter, withDigit).user_a).toBe(withDigit);
  });

  it("normaliza a minúscula, como guarda Postgres los uuid", () => {
    expect(orderedPair("AAAAAAAA-0000-4000-8000-000000000000", PJ1)).toEqual({
      user_a: PJ1,
      user_b: "aaaaaaaa-0000-4000-8000-000000000000",
    });
  });
});

describe("normalizeMessageBody", () => {
  it("saca los espacios de las puntas", () => {
    expect(normalizeMessageBody("  hola  ")).toBe("hola");
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["solo saltos de línea", "\n\n"],
    ["2001 caracteres", "a".repeat(2001)],
  ])("rechaza %s", (_caso, body) => {
    expect(() => normalizeMessageBody(body)).toThrow(MessageError);
  });

  it("acepta 1 y 2000 caracteres", () => {
    expect(normalizeMessageBody("a")).toBe("a");
    expect(normalizeMessageBody("a".repeat(2000))).toHaveLength(2000);
  });

  it("mide después de recortar: 2000 caracteres con espacios alrededor pasan", () => {
    expect(normalizeMessageBody(`  ${"a".repeat(2000)}  `)).toHaveLength(2000);
  });
});

describe("messageErrorKey", () => {
  it.each([
    ["23514", 'new row violates check constraint "messages_body_length"', "invalidBody"],
    ["23514", 'new row violates check constraint "conversations_ordered_pair"', "selfConversation"],
    ["23503", 'violates foreign key constraint "conversations_user_a_fkey"', "recipientNotFound"],
    ["23503", 'violates foreign key constraint "conversations_user_b_fkey"', "recipientNotFound"],
    ["42501", "new row violates row-level security policy", "forbidden"],
  ])("%s %s → %s", (code, message, expected) => {
    expect(messageErrorKey({ code, message })).toBe(expected);
  });

  it.each([
    // Un 23503 de otra foránea no es "esa cuenta no existe".
    ["23503", 'violates foreign key constraint "messages_sender_id_fkey"'],
    // Un 23514 de otro check tampoco es un texto inválido.
    ["23514", 'violates check constraint "otro_check"'],
    ["23505", 'duplicate key value violates unique constraint "conversations_unique_pair"'],
  ])("%s %s → unexpected", (code, message) => {
    expect(messageErrorKey({ code, message })).toBe("unexpected");
  });

  it("respeta la clave de un MessageError", () => {
    expect(messageErrorKey(new MessageError("invalidBody"))).toBe("invalidBody");
  });

  it("algo que no es un error de PostgREST es unexpected", () => {
    expect(messageErrorKey(null)).toBe("unexpected");
    expect(messageErrorKey("23514")).toBe("unexpected");
  });
});

describe("getOrCreateConversation", () => {
  it("crea la conversación con el par ordenado", async () => {
    const { client, calls } = fakeClient(DE1, [{ data: { id: CONVERSATION }, error: null }]);

    expect(await getOrCreateConversation(client, PJ1)).toBe(CONVERSATION);
    expect(calls.find((call) => call.method === "insert")?.args[0]).toEqual({
      user_a: PJ1,
      user_b: DE1,
    });
  });

  it("si ya existe (23505), lee la existente y devuelve su id", async () => {
    const { client, calls } = fakeClient(DE1, [
      { data: null, error: { code: "23505", message: "conversations_unique_pair" } },
      { data: { id: CONVERSATION }, error: null },
    ]);

    expect(await getOrCreateConversation(client, PJ1)).toBe(CONVERSATION);
    expect(calls.filter((call) => call.method === "eq").map((call) => call.args)).toEqual([
      ["user_a", PJ1],
      ["user_b", DE1],
    ]);
  });

  it("cualquier otro error se lanza tal cual", async () => {
    const error = { code: "23514", message: "conversations_ordered_pair" };
    const { client } = fakeClient(PJ1, [{ data: null, error }]);

    await expect(getOrCreateConversation(client, PJ1)).rejects.toBe(error);
  });

  it("sin sesión es forbidden, sin ir a la base", async () => {
    const { client, calls } = fakeClient(null, []);

    await expect(getOrCreateConversation(client, PJ1)).rejects.toMatchObject({ key: "forbidden" });
    expect(calls).toEqual([]);
  });
});

describe("sendMessage", () => {
  it("manda el texto recortado a nombre de quien tiene la sesión", async () => {
    const { client, calls } = fakeClient(PJ1, [{ data: { id: "m" }, error: null }]);

    await sendMessage(client, CONVERSATION, "  hola  ");

    expect(calls.find((call) => call.method === "insert")?.args[0]).toEqual({
      conversation_id: CONVERSATION,
      sender_id: PJ1,
      body: "hola",
    });
  });

  it("un texto inválido no llega a la base", async () => {
    const { client, calls } = fakeClient(PJ1, []);

    await expect(sendMessage(client, CONVERSATION, "   ")).rejects.toMatchObject({
      key: "invalidBody",
    });
    expect(calls).toEqual([]);
  });

  it("un error de la base se lanza tal cual", async () => {
    const error = { code: "42501", message: "new row violates row-level security policy" };
    const { client } = fakeClient(PJ1, [{ data: null, error }]);

    await expect(sendMessage(client, CONVERSATION, "hola")).rejects.toBe(error);
  });
});
