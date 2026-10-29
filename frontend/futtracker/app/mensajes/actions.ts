"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  MESSAGES_PAGE_SIZE,
  getOrCreateConversation,
  listMessages,
  messageErrorKey,
  normalizeMessageBody,
  sendMessage,
  type MessageErrorKey,
} from "@/lib/data/messages";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Cada Server Action es un POST público: los argumentos se validan acá aunque
// el botón o la caja ya los hayan validado, y la autorización la hace la RLS.

export type MessageActionResult = { ok: true } | { ok: false; error: MessageErrorKey };

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const idSchema = z.uuid();

// Solo los errores que tienen texto propio; el resto es "unexpected".
function toActionError(error: unknown): MessageErrorKey {
  const key = messageErrorKey(error);

  return key === "invalidBody" || key === "selfConversation" || key === "recipientNotFound"
    ? key
    : "unexpected";
}

/**
 * "Enviar mensaje" en un perfil (requisito 1): abre la conversación con esa
 * cuenta, creándola si no existía, y lleva al hilo.
 *
 * El `redirect` va afuera del `try`: es una excepción de Next y el `catch` la
 * tragaría.
 */
export async function startConversationAction(
  otherProfileId: unknown,
): Promise<MessageActionResult> {
  const parsed = idSchema.safeParse(otherProfileId);

  if (!parsed.success) {
    return { ok: false, error: "unexpected" };
  }

  let conversationId: string;

  try {
    const supabase = await createClient();
    conversationId = await getOrCreateConversation(supabase, parsed.data);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  revalidatePath(RouteConstants.messages.inbox);
  redirect(RouteConstants.messages.thread(conversationId));
}

/** La caja de texto del hilo (requisito 6). */
export async function sendMessageAction(
  conversationId: unknown,
  body: unknown,
): Promise<MessageActionResult> {
  const parsedId = idSchema.safeParse(conversationId);

  if (!parsedId.success || typeof body !== "string") {
    return { ok: false, error: "unexpected" };
  }

  try {
    // Recorta y valida antes de ir a la base: el mismo `check` que la tabla.
    normalizeMessageBody(body);
    const supabase = await createClient();
    await sendMessage(supabase, parsedId.data, body);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  revalidatePath(RouteConstants.messages.inbox);
  revalidatePath(RouteConstants.messages.thread(parsedId.data));

  return { ok: true };
}

export type OlderMessagesResult =
  | { ok: true; messages: ThreadMessage[]; hasMore: boolean }
  | { ok: false };

// El mensaje más viejo que ya se ve: fecha **e id**, porque dos mensajes del
// mismo instante se perdían paginando solo por fecha.
const cursorSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

/**
 * "Ver mensajes anteriores" (requisito 5): los 50 anteriores a `before`, del
 * más viejo al más nuevo, y si quedan más. Un ajeno recibe una lista vacía: la
 * RLS no le muestra nada.
 */
export async function loadOlderMessagesAction(
  conversationId: unknown,
  before: unknown,
): Promise<OlderMessagesResult> {
  const parsedId = idSchema.safeParse(conversationId);
  const parsedBefore = cursorSchema.safeParse(before);

  if (!parsedId.success || !parsedBefore.success) {
    return { ok: false };
  }

  try {
    const supabase = await createClient();
    // Uno de más para saber si hay otra página, sin contar aparte.
    const rows = await listMessages(supabase, parsedId.data, {
      before: parsedBefore.data,
      limit: MESSAGES_PAGE_SIZE + 1,
    });

    return {
      ok: true,
      messages: rows.slice(0, MESSAGES_PAGE_SIZE).reverse().map(toThreadMessage),
      hasMore: rows.length > MESSAGES_PAGE_SIZE,
    };
  } catch {
    return { ok: false };
  }
}

function toThreadMessage(row: ThreadMessage): ThreadMessage {
  return { id: row.id, sender_id: row.sender_id, body: row.body, created_at: row.created_at };
}
