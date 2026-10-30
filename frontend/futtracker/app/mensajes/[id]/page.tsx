import Link from "next/link";
import { notFound } from "next/navigation";

import { getMessagesAccess, getThread } from "@/app/mensajes/access";
import MessageComposer from "@/components/messages/MessageComposer";
import MessageThread from "@/components/messages/MessageThread";
import ParticipantAvatar from "@/components/messages/ParticipantAvatar";
import RefreshNavBadges from "@/components/messages/RefreshNavBadges";
import { LINK_CLASS } from "@/components/vacancies/styles";
import {
  MESSAGES_PAGE_SIZE,
  listMessages,
  markConversationRead,
  type ConversationSummary,
} from "@/lib/data/messages";
import { getAvatarSignedUrl } from "@/lib/data/players";
import { roleLabel } from "@/lib/format/messageLabels";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// "Ver perfil" (requisito 4): el perfil del jugador, o el equipo del delegado.
// Un delegado sin equipo no tiene perfil para mostrar.
async function profileHrefFor(
  supabase: ServerClient,
  other: ConversationSummary["other"],
): Promise<string | null> {
  if (other.role !== "delegate") {
    return RouteConstants.profile.view(other.id);
  }

  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", other.id)
    .maybeSingle();

  return data ? RouteConstants.team.view(data.id) : null;
}

export default async function ThreadPage({ params }: PageProps<"/mensajes/[id]">) {
  const { id } = await params;
  const [access, conversation] = await Promise.all([getMessagesAccess(), getThread(id)]);

  // El layout ya respondió el 404; esto es para que TypeScript lo sepa.
  if (!conversation) {
    notFound();
  }

  if (access.status !== "signedIn") {
    throw new Error("No se pudo leer la sesión");
  }

  const supabase = await createClient();
  const { other } = conversation;

  const [rows, avatarUrl, profileHref] = await Promise.all([
    // Uno de más para saber si hay mensajes anteriores, sin contar aparte.
    listMessages(supabase, id, { limit: MESSAGES_PAGE_SIZE + 1 }),
    getAvatarSignedUrl(supabase, other.avatar_path).catch(() => null),
    profileHrefFor(supabase, other),
    // Al abrir se marca como leído (requisito 4). Si falla, el hilo igual se ve.
    markConversationRead(supabase, id).catch(() => 0),
  ]);

  const messages = rows
    .slice(0, MESSAGES_PAGE_SIZE)
    .reverse()
    .map(({ id: messageId, sender_id, body, created_at }) => ({
      id: messageId,
      sender_id,
      body,
      created_at,
    }));

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col bg-surface">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <Link
          href={RouteConstants.messages.inbox}
          className="rounded-md px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span aria-hidden="true">← </span>Volver
        </Link>
        <ParticipantAvatar fullName={other.full_name} avatarUrl={avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-zinc-900">{other.full_name}</h1>
          <p className="text-xs text-zinc-500">{roleLabel(other.role)}</p>
        </div>
        {profileHref ? (
          <Link href={profileHref} className={`${LINK_CLASS} shrink-0`}>
            Ver perfil
          </Link>
        ) : null}
      </header>

      <MessageThread
        conversationId={id}
        messages={messages}
        hasMore={rows.length > MESSAGES_PAGE_SIZE}
        myId={access.userId}
        otherName={other.full_name}
      />

      <MessageComposer conversationId={id} />
      <RefreshNavBadges unreadCount={conversation.unread_count} />
    </div>
  );
}
