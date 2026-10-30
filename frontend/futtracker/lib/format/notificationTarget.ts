import { z } from "zod";

import type { Notification } from "@/lib/data/notifications";
import { RouteConstants } from "@/lib/routes";

export const notificationTargetSchema = z.discriminatedUnion("type", [
  z.object({ id: z.uuid(), type: z.literal("new_message"), conversationId: z.uuid() }),
  z.object({ id: z.uuid(), type: z.literal("new_application"), vacancyId: z.uuid() }),
]);

export type NotificationTarget = z.infer<typeof notificationTargetSchema>;

// `null` es solo defensivo: el `check` de la tabla exige el destino según el tipo.
export function notificationTarget(notification: Notification): NotificationTarget | null {
  if (notification.type === "new_message" && notification.conversation_id) {
    return { id: notification.id, type: "new_message", conversationId: notification.conversation_id };
  }

  if (notification.type === "new_application" && notification.vacancy_id) {
    return { id: notification.id, type: "new_application", vacancyId: notification.vacancy_id };
  }

  return null;
}

export function notificationHref(target: NotificationTarget): string {
  return target.type === "new_message"
    ? RouteConstants.messages.thread(target.conversationId)
    : RouteConstants.team.myApplications(target.vacancyId);
}
