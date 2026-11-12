import { cache } from "react";
import { z } from "zod";

import { getConversationSummary, type ConversationSummary } from "@/lib/data/messages";
import { roleSchema, type Role } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

// `cache`: el layout y la página piden lo mismo en el mismo render; así va una
// sola vez a la base.

export type MessagesAccess =
  | { status: "signedIn"; userId: string; role: Role }
  | { status: "signedOut" }
  | { status: "unavailable" };

// Mismo criterio que `getVacanciesAccess`: una caída no es "sin sesión".
export const getMessagesAccess = cache(async (): Promise<MessagesAccess> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "signedOut" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = roleSchema.safeParse(data?.role);

  if (error || !role.success) {
    return { status: "unavailable" };
  }

  return { status: "signedIn", userId: user.id, role: role.data };
});

const idSchema = z.uuid();

/**
 * La conversación del hilo, o `null` si el id no es válido, no existe o quien
 * consulta no es participante: para la pantalla son el mismo 404 (requisito 4).
 */
export const getThread = cache(async (id: string): Promise<ConversationSummary | null> => {
  if (!idSchema.safeParse(id).success) {
    return null;
  }

  const supabase = await createClient();

  return getConversationSummary(supabase, id);
});
