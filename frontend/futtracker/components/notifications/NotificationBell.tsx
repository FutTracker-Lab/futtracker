import Link from "next/link";

import CountBadge from "@/components/nav/CountBadge";
import { unreadNotificationsLabel } from "@/lib/format/notificationLabels";
import { RouteConstants } from "@/lib/routes";

type Props = {
  count: number;
  isActive: boolean;
};

export default function NotificationBell({ count, isActive }: Props) {
  return (
    <Link
      href={RouteConstants.notifications.list}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isActive
          ? "bg-panel-active text-panel-foreground"
          : "text-panel-muted hover:bg-panel-active/50 hover:text-panel-foreground"
      }`}
    >
      {/* Lucide "bell" inline, para no sumar la dependencia (como components/landing/icons.tsx). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M10.268 21a2 2 0 0 0 3.464 0" />
        <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
      </svg>
      {count > 0 ? (
        <span className="absolute -top-1 -right-1">
          <CountBadge count={count} label={unreadNotificationsLabel(count)} />
        </span>
      ) : (
        <span className="sr-only">Notificaciones</span>
      )}
    </Link>
  );
}
