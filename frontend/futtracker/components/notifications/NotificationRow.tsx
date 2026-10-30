import type { NotificationActionResult } from "@/app/notificaciones/actions";
import ParticipantAvatar from "@/components/messages/ParticipantAvatar";
import NotificationActionButton from "@/components/notifications/NotificationActionButton";
import type { Notification } from "@/lib/data/notifications";
import { relativeTimeLabel } from "@/lib/format/messageLabels";
import { actorName, notificationText } from "@/lib/format/notificationLabels";

type Props = {
  notification: Notification;
  avatarUrl: string | null;
  open: () => Promise<NotificationActionResult>;
  // Inyectado para que el test no dependa del reloj.
  now?: Date;
};

export default function NotificationRow({ notification, avatarUrl, open, now }: Props) {
  const unread = notification.read_at === null;

  return (
    <li>
      <NotificationActionButton
        action={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:opacity-60 sm:px-5"
      >
        <ParticipantAvatar
          fullName={actorName(notification)}
          avatarUrl={avatarUrl}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <span className={`text-sm ${unread ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>
            {notificationText(notification)}
          </span>
          <time dateTime={notification.created_at} className="shrink-0 text-xs text-zinc-500">
            {relativeTimeLabel(notification.created_at, now)}
          </time>
        </span>

        {unread ? (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand">
            <span className="sr-only">Sin leer</span>
          </span>
        ) : null}
      </NotificationActionButton>
    </li>
  );
}
