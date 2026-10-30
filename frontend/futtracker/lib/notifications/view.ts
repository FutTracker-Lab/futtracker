import { z } from "zod";

import type { Notification } from "@/lib/data/notifications";

export const NOTIFICATIONS_PAGE_SIZE = 20;

const beforeSchema = z.iso.datetime({ offset: true });

export function parseBeforeParam(value: unknown): string | undefined {
  const parsed = beforeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export type NotificationsView = {
  notifications: Notification[];
  nextBefore: string | null;
  showMarkAll: boolean;
};

// `rows` llega con un aviso de más (la sonda) para saber si hay otra página sin contar aparte.
export function notificationsView(rows: Notification[], unreadCount: number): NotificationsView {
  const notifications = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);
  const last = notifications[notifications.length - 1];

  return {
    notifications,
    nextBefore: rows.length > NOTIFICATIONS_PAGE_SIZE && last ? last.created_at : null,
    showMarkAll: unreadCount > 0,
  };
}
