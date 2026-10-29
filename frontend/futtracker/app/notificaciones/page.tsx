import Link from "next/link";

import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/app/notificaciones/actions";
import NotificationActionButton from "@/components/notifications/NotificationActionButton";
import { getUnreadCounts } from "@/components/nav/unreadCounts";
import NotificationRow from "@/components/notifications/NotificationRow";
import { SECONDARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { listNotifications } from "@/lib/data/notifications";
import { getAvatarSignedUrls } from "@/lib/data/players";
import { notificationTarget } from "@/lib/format/notificationTarget";
import {
  NOTIFICATIONS_PAGE_SIZE,
  notificationsView,
  parseBeforeParam,
} from "@/lib/notifications/view";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage({ searchParams }: PageProps<"/notificaciones">) {
  const { antes: beforeParam } = await searchParams;

  const supabase = await createClient();
  const [rows, unread] = await Promise.all([
    listNotifications(supabase, {
      limit: NOTIFICATIONS_PAGE_SIZE + 1,
      before: parseBeforeParam(beforeParam),
    }),
    getUnreadCounts(),
  ]);

  const { notifications, nextBefore, showMarkAll } = notificationsView(rows, unread.notifications);

  // Si fallan las fotos, quedan las iniciales.
  const paths = notifications.flatMap((n) => (n.actor?.avatar_path ? [n.actor.avatar_path] : []));
  const avatarUrls = await getAvatarSignedUrls(supabase, paths).catch(() => new Map<string, string>());

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Notificaciones</h1>
          {showMarkAll ? (
            <NotificationActionButton
              action={markAllNotificationsReadAction}
              className={SECONDARY_BUTTON_CLASS}
            >
              Marcar todas como leídas
            </NotificationActionButton>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-zinc-700">No tenés notificaciones.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {notifications.map((notification) => {
              const target = notificationTarget(notification);

              return target ? (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  avatarUrl={
                    notification.actor?.avatar_path
                      ? (avatarUrls.get(notification.actor.avatar_path) ?? null)
                      : null
                  }
                  open={openNotificationAction.bind(null, target)}
                />
              ) : null;
            })}
          </ul>
        )}

        {nextBefore ? (
          <Link
            href={RouteConstants.notifications.before(nextBefore)}
            className={`${SECONDARY_BUTTON_CLASS} self-center`}
          >
            Ver anteriores
          </Link>
        ) : null}
      </div>
    </div>
  );
}
