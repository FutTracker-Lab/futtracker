"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/requireSession";
import {
  markNotificationsRead,
  notificationErrorKey,
  type NotificationErrorKey,
} from "@/lib/data/notifications";
import { notificationHref, notificationTargetSchema } from "@/lib/format/notificationTarget";
import { RouteConstants } from "@/lib/routes";

// El destino llega del cliente, así que se valida acá; la marca solo alcanza avisos propios por `auth.uid()`.

export type NotificationActionResult = { ok: true } | { ok: false; error: NotificationErrorKey };

export async function openNotificationAction(target: unknown): Promise<NotificationActionResult> {
  const { supabase } = await requireSession();
  const parsed = notificationTargetSchema.safeParse(target);

  if (!parsed.success) {
    return { ok: false, error: "generic" };
  }

  try {
    await markNotificationsRead(supabase, [parsed.data.id]);
  } catch (error) {
    return { ok: false, error: notificationErrorKey(error) };
  }

  revalidatePath(RouteConstants.notifications.list);
  // Afuera del `try`: `redirect` es una excepción de Next.
  redirect(notificationHref(parsed.data));
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const { supabase } = await requireSession();

  try {
    await markNotificationsRead(supabase);
  } catch (error) {
    return { ok: false, error: notificationErrorKey(error) };
  }

  revalidatePath(RouteConstants.notifications.list);

  return { ok: true };
}
