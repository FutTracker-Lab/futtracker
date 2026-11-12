import type { Notification } from "@/lib/data/notifications";

// El mismo texto para `forbidden` y `generic`: el ticket pide uno solo.
export const NOTIFICATION_ERROR_TEXT = "No pudimos actualizar tus notificaciones. Probá de nuevo.";

export function unreadNotificationsLabel(count: number): string {
  return count === 1 ? "1 notificación sin leer" : `${count} notificaciones sin leer`;
}

export function actorName(notification: Pick<Notification, "actor">): string {
  return notification.actor?.full_name ?? "Alguien";
}

export function notificationText(
  notification: Pick<Notification, "type" | "actor" | "vacancy_position">,
): string {
  const name = actorName(notification);

  if (notification.type === "new_message") {
    return `${name} te envió un mensaje`;
  }

  // El slug ya es la palabra en español ("arquero"); sin playerLabels para no sumar zod al chunk del nav.
  return notification.vacancy_position
    ? `${name} se postuló a tu vacante de ${notification.vacancy_position}`
    : `${name} se postuló a tu vacante`;
}
