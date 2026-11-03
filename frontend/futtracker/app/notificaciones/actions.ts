"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  markNotificationsRead,
  notificationErrorKey,
  type NotificationErrorKey,
} from "@/lib/data/notifications";
import { notificationHref, notificationTargetSchema } from "@/lib/format/notificationTarget";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// El destino llega del cliente, así que se valida acá; la marca solo alcanza avisos propios por `auth.uid()`.

export type NotificationActionResult = { ok: true } | { ok: false; error: NotificationErrorKey };

export async function openNotificationAction(target: unknown): Promise<NotificationActionResult> {
  const parsed = notificationTargetSchema.safeParse(target);

  if (!parsed.success) {
    return { ok: false, error: "generic" };
  }

  try {
    const supabase = await createClient();
    await markNotificationsRead(supabase, [parsed.data.id]);
  } catch (error) {
    return { ok: false, error: notificationErrorKey(error) };
  }

  revalidatePath(RouteConstants.notifications.list);
  // Afuera del `try`: `redirect` es una excepción de Next.
  redirect(notificationHref(parsed.data));
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  try {
    const supabase = await createClient();
    await markNotificationsRead(supabase);
  } catch (error) {
    return { ok: false, error: notificationErrorKey(error) };
  }

  revalidatePath(RouteConstants.notifications.list);

  return { ok: true };
}
