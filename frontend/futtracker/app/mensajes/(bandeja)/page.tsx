import Link from "next/link";

import { getMessagesAccess } from "@/app/mensajes/access";
import ConversationRow from "@/components/messages/ConversationRow";
import { PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { listConversations } from "@/lib/data/messages";
import { getAvatarSignedUrls } from "@/lib/data/players";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// La bandeja (requisito 2). Va en el grupo `(bandeja)` para que su loading.tsx
// no envuelva al hilo: dentro de ese Suspense, el `notFound()` del hilo saldría
// con status 200 (requisito 4).
export default async function InboxPage() {
  const access = await getMessagesAccess();

  if (access.status !== "signedIn") {
    // "unavailable": que lo atrape error.tsx con "Reintentar".
    throw new Error("No se pudo leer la sesión");
  }

  const supabase = await createClient();
  const conversations = await listConversations(supabase);

  // Una sola llamada para todas las fotos. Si falla, la bandeja igual se ve,
  // con iniciales: una foto no vale una pantalla de error.
  const paths = conversations.flatMap((c) => (c.other.avatar_path ? [c.other.avatar_path] : []));
  const avatarUrls = await getAvatarSignedUrls(supabase, paths).catch(() => new Map<string, string>());

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-zinc-900">Mensajes</h1>

        {conversations.length === 0 ? (
          <EmptyInbox role={access.role} />
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                avatarUrl={
                  conversation.other.avatar_path
                    ? (avatarUrls.get(conversation.other.avatar_path) ?? null)
                    : null
                }
                myId={access.userId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Requisito 3: el siguiente paso según el rol.
function EmptyInbox({ role }: { role: "player" | "delegate" }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm text-zinc-700">Todavía no tenés mensajes.</p>
      {role === "player" ? (
        <Link href={RouteConstants.vacancies.board} className={PRIMARY_BUTTON_CLASS}>
          Ver vacantes
        </Link>
      ) : (
        <Link href={RouteConstants.search} className={PRIMARY_BUTTON_CLASS}>
          Buscar jugadores
        </Link>
      )}
    </div>
  );
}
