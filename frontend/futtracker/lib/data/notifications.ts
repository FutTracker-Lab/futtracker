import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type NotificationType = "new_message" | "new_application";

export type Notification = {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  conversation_id: string | null;
  vacancy_id: string | null;
  vacancy_position: string | null;
  // null si el actor borró su cuenta.
  actor: { id: string; full_name: string; avatar_path: string | null } | null;
};

// `generic` y no `unexpected` como el resto: son las claves `notifications.errors.*` del ticket.
export type NotificationErrorKey = "forbidden" | "generic";

export function notificationErrorKey(error: unknown): NotificationErrorKey {
  if (typeof error === "object" && error !== null && (error as { code?: string }).code === "42501") {
    return "forbidden";
  }

  return "generic";
}

export async function listNotifications(
  client: Client,
  { limit = 20, before }: { limit?: number; before?: string } = {},
): Promise<Notification[]> {
  let query = client
    .from("notifications")
    .select(
      "id, type, created_at, read_at, conversation_id, vacancy_id, actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_path), vacancy:vacancies(position)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    type: row.type as NotificationType,
    created_at: row.created_at,
    read_at: row.read_at,
    conversation_id: row.conversation_id,
    vacancy_id: row.vacancy_id,
    vacancy_position: row.vacancy?.position ?? null,
    actor: row.actor,
  }));
}

export async function countUnreadNotifications(client: Client): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationsRead(client: Client, ids?: string[]): Promise<number> {
  const { data, error } = await client.rpc("mark_notifications_read", ids ? { p_ids: ids } : {});

  if (error) {
    throw error;
  }

  return data;
}
