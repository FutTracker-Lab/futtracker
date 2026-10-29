import Link from "next/link";

import ParticipantAvatar from "@/components/messages/ParticipantAvatar";
import type { ConversationSummary } from "@/lib/data/messages";
import {
  previewText,
  relativeTimeLabel,
  roleLabel,
  unreadLabel,
} from "@/lib/format/messageLabels";
import { RouteConstants } from "@/lib/routes";

type Props = {
  conversation: ConversationSummary;
  avatarUrl: string | null;
  myId: string;
  // Inyectado para que el test no dependa del reloj.
  now?: Date;
};

// Una fila de la bandeja (requisito 2). La fila entera es el link al hilo.
export default function ConversationRow({ conversation, avatarUrl, myId, now }: Props) {
  const { other, last_message: lastMessage, unread_count: unread } = conversation;
  const timestamp = lastMessage?.created_at ?? conversation.created_at;

  return (
    <li>
      <Link
        href={RouteConstants.messages.thread(conversation.id)}
        className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:px-5"
      >
        <ParticipantAvatar fullName={other.full_name} avatarUrl={avatarUrl} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-semibold text-zinc-900">
              {other.full_name}
              <span className="ml-2 text-xs font-normal text-zinc-500">{roleLabel(other.role)}</span>
            </p>
            <time dateTime={timestamp} className="shrink-0 text-xs text-zinc-500">
              {relativeTimeLabel(timestamp, now)}
            </time>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p
              className={`truncate text-sm ${unread > 0 ? "font-medium text-zinc-900" : "text-zinc-600"}`}
            >
              {previewText(lastMessage, myId)}
            </p>
            {unread > 0 ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-foreground">
                <span aria-hidden="true">{unread}</span>
                <span className="sr-only">{unreadLabel(unread)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
