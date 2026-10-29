import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Mensajería (T14a): conversaciones 1 a 1 y mensajes de texto.
// ---------------------------------------------------------------------------

type Client = SupabaseClient<Database>;

export type Message = Tables<"messages">;

// Repite el `check` `messages_body_length` de la migración: acá frena un
// mensaje vacío o largo antes del viaje a la base. Si cambia uno, cambia el
// otro.
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGES_PAGE_SIZE = 50;

// Mismo patrón que `FollowErrorKey` y `ApplicationErrorKey`: claves para que la
// pantalla elija el texto, nunca el mensaje crudo de Postgres. Son las de
// `messages.errors.*` del ticket.
export type MessageErrorKey =
  | "invalidBody"
  | "selfConversation"
  | "recipientNotFound"
  | "forbidden"
  | "unexpected";

export class MessageError extends Error {
  constructor(readonly key: MessageErrorKey) {
    super(key);
    this.name = "MessageError";
  }
}

/**
 * Traduce el error de la mensajería a su clave.
 *
 * Los 23514 y 23503 se miran junto con el nombre del constraint, como en
 * `followErrorKey`: el código solo no dice qué falló. Un 23503 en la foránea a
 * `profiles` de `conversations` es "esa cuenta no existe"; cualquier otra
 * foránea no lo es.
 */
export function messageErrorKey(error: unknown): MessageErrorKey {
  if (error instanceof MessageError) {
    return error.key;
  }

  if (typeof error !== "object" || error === null) {
    return "unexpected";
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "23514" && message?.includes("messages_body_length")) {
    return "invalidBody";
  }

  if (code === "23514" && message?.includes("conversations_ordered_pair")) {
    return "selfConversation";
  }

  if (
    code === "23503" &&
    (message?.includes("conversations_user_a_fkey") ||
      message?.includes("conversations_user_b_fkey"))
  ) {
    return "recipientNotFound";
  }

  if (code === "42501") {
    return "forbidden";
  }

  return "unexpected";
}

async function sessionUserId(client: Client): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.id ?? null;
}

/**
 * El par en el orden canónico de la tabla (`user_a < user_b`).
 *
 * Comparar los strings da el mismo orden que Postgres con los `uuid`: los dos
 * van en minúscula, con los guiones en las mismas posiciones, y en ASCII los
 * dígitos van antes que `a`-`f`.
 */
export function orderedPair(first: string, second: string): { user_a: string; user_b: string } {
  const a = first.toLowerCase();
  const b = second.toLowerCase();

  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

/**
 * El `id` de la conversación con otra cuenta, creándola si todavía no existe.
 *
 * Intenta el `insert` y ante un 23505 lee la existente, en vez de leer primero:
 * así dos pestañas que abren la misma conversación a la vez no crean dos (la
 * base no lo permite) ni fallan.
 *
 * Una conversación con uno mismo rebota en la base con 23514
 * (`selfConversation`), y una cuenta que no existe con 23503
 * (`recipientNotFound`). Los errores se lanzan tal cual; el que llama los
 * traduce con `messageErrorKey`.
 */
export async function getOrCreateConversation(
  client: Client,
  otherProfileId: string,
): Promise<string> {
  const userId = await sessionUserId(client);

  if (!userId) {
    throw new MessageError("forbidden");
  }

  const pair = orderedPair(userId, otherProfileId);

  const { data, error } = await client.from("conversations").insert(pair).select("id").single();

  if (!error) {
    return data.id;
  }

  if (error.code !== "23505") {
    throw error;
  }

  const { data: existing, error: readError } = await client
    .from("conversations")
    .select("id")
    .eq("user_a", pair.user_a)
    .eq("user_b", pair.user_b)
    .single();

  if (readError) {
    throw readError;
  }

  return existing.id;
}

// Lo que no se ve: espacios de cualquier tipo (NBSP, U+3000), saltos de línea,
// tabs y caracteres de ancho cero (U+200B, U+FEFF). La misma lista que el
// `check` `messages_body_length` de la migración: si cambia una, cambia la otra.
const INVISIBLE_ONLY = /^[\s\u00a0\u1680\u180e\u2000-\u200f\u2028\u2029\u202f\u205f\u2060\u3000\ufeff]*$/u;

/**
 * Cuántos caracteres cuenta la base: sin los espacios de las puntas y por
 * caracter, no por unidad UTF-16 (`char_length` cuenta un emoji como 1;
 * `.length` de JavaScript, como 2).
 */
export function messageLength(body: string): number {
  return [...body.trim()].length;
}

/** Si el texto se puede enviar: entre 1 y 2000 caracteres y alguno visible. */
export function isSendableBody(body: string): boolean {
  const length = messageLength(body);

  return length >= 1 && length <= MESSAGE_MAX_LENGTH && !INVISIBLE_ONLY.test(body);
}

/**
 * El texto que se guarda: sin espacios en las puntas, entre 1 y 2000
 * caracteres y con al menos uno visible. Si no cumple,
 * `MessageError("invalidBody")`.
 */
export function normalizeMessageBody(body: string): string {
  if (!isSendableBody(body)) {
    throw new MessageError("invalidBody");
  }

  return body.trim();
}

/**
 * Manda un mensaje a nombre del usuario con sesión. Que sea participante de la
 * conversación lo exige la RLS: si no, 42501 (`forbidden`).
 */
export async function sendMessage(
  client: Client,
  conversationId: string,
  body: string,
): Promise<Message> {
  const text = normalizeMessageBody(body);
  const senderId = await sessionUserId(client);

  if (!senderId) {
    throw new MessageError("forbidden");
  }

  const { data, error } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: text })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Tipo propio y no el generado: en las vistas el generador marca todas las
// columnas como nulables, y `id`, `other_id`, `other_full_name`, `other_role`
// y `unread_count` siempre vienen.
export type ConversationSummary = {
  id: string;
  created_at: string;
  last_message_at: string | null;
  other: {
    id: string;
    full_name: string;
    avatar_path: string | null;
    role: string;
  };
  last_message: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
};

/**
 * Las conversaciones del usuario con sesión, de la de mensaje más reciente a
 * la más vieja; las que todavía no tienen mensajes van al final.
 *
 * Sale de la vista `conversation_summaries`, que arma el otro participante, el
 * último mensaje (recortado a 120 caracteres) y los no leídos en una sola
 * consulta.
 */
export async function listConversations(client: Client): Promise<ConversationSummary[]> {
  const { data, error } = await client
    .from("conversation_summaries")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id!,
    created_at: row.created_at!,
    last_message_at: row.last_message_at,
    other: {
      id: row.other_id!,
      full_name: row.other_full_name ?? "",
      avatar_path: row.other_avatar_path,
      role: row.other_role!,
    },
    last_message:
      row.last_message_body === null
        ? null
        : {
            body: row.last_message_body,
            created_at: row.last_message_created_at!,
            sender_id: row.last_message_sender_id!,
          },
    unread_count: row.unread_count ?? 0,
  }));
}

/** El último mensaje de una página: desde dónde sigue la anterior. */
export type MessageCursor = { created_at: string; id: string };

/**
 * Los mensajes de una conversación, del más nuevo al más viejo.
 *
 * Se pagina con `before`: el `created_at` y el `id` del mensaje más viejo de la
 * página anterior. Con el `created_at` solo, dos mensajes del mismo instante
 * podían quedar uno en cada página y perderse; el `id` desempata, igual que en
 * el orden. Un participante ajeno no rebota: la RLS le devuelve 0 filas.
 */
export async function listMessages(
  client: Client,
  conversationId: string,
  { before, limit = MESSAGES_PAGE_SIZE }: { before?: MessageCursor; limit?: number } = {},
): Promise<Message[]> {
  let query = client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (before) {
    // Comillas porque el timestamp trae `:` y `+`, que PostgREST usa en la
    // sintaxis de los filtros.
    query = query.or(
      `created_at.lt."${before.created_at}",and(created_at.eq."${before.created_at}",id.lt.${before.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Marca como leídos los mensajes recibidos en la conversación. Devuelve
 * cuántos marcó: 0 si ya estaban leídos o si quien llama no es participante.
 */
export async function markConversationRead(
  client: Client,
  conversationId: string,
): Promise<number> {
  const { data, error } = await client.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw error;
  }

  return data;
}
