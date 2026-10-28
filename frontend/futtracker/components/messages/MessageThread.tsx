"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";

import { loadOlderMessagesAction, type ThreadMessage } from "@/app/mensajes/actions";
import MessageBubble from "@/components/messages/MessageBubble";
import { SECONDARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { dayLabel, groupByDay } from "@/lib/format/messageLabels";

type Props = {
  conversationId: string;
  // Los últimos 50, del más viejo al más nuevo. Al enviar, el servidor los
  // vuelve a mandar (revalidatePath) con el mensaje nuevo al final.
  messages: ThreadMessage[];
  hasMore: boolean;
  myId: string;
  otherName: string;
};

/**
 * El hilo (requisito 5): del más viejo al más nuevo, separado por día, con el
 * scroll en el último mensaje. "Ver mensajes anteriores" agrega arriba los 50
 * anteriores sin mover lo que se está leyendo.
 */
export default function MessageThread({
  conversationId,
  messages,
  hasMore,
  myId,
  otherName,
}: Props) {
  const [older, setOlder] = useState<ThreadMessage[]>([]);
  const [moreBefore, setMoreBefore] = useState(hasMore);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Alto del contenido antes de agregar los anteriores, para compensar el scroll.
  const heightBeforePrepend = useRef<number | null>(null);

  const all = [...older, ...messages];
  const lastId = messages[messages.length - 1]?.id;

  // Al abrir y con cada mensaje nuevo, al fondo.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lastId]);

  // Después de agregar los anteriores, el mismo mensaje sigue a la vista.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && heightBeforePrepend.current !== null) {
      element.scrollTop += element.scrollHeight - heightBeforePrepend.current;
      heightBeforePrepend.current = null;
    }
  }, [older]);

  function loadOlder() {
    const oldest = all[0];
    if (!oldest) return;

    startTransition(async () => {
      const result = await loadOlderMessagesAction(conversationId, oldest.created_at);

      if (!result.ok) {
        setLoadFailed(true);
        return;
      }

      setLoadFailed(false);
      heightBeforePrepend.current = scrollRef.current?.scrollHeight ?? null;
      setOlder((current) => [...result.messages, ...current]);
      setMoreBefore(result.hasMore);
    });
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      {moreBefore ? (
        <div className="mb-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadOlder}
            disabled={isPending}
            className={SECONDARY_BUTTON_CLASS}
          >
            {isPending ? "Cargando…" : "Ver mensajes anteriores"}
          </button>
          {loadFailed ? (
            <p role="alert" className="text-xs text-red-700">
              No pudimos cargar los mensajes anteriores.
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        role="log"
        aria-live="polite"
        aria-label={`Conversación con ${otherName}`}
        className="flex flex-col gap-4"
      >
        {all.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-600">
            Escribile a {otherName} para empezar la conversación.
          </p>
        ) : (
          groupByDay(all).map((group) => {
            const label = dayLabel(group.messages[0].created_at);

            return (
              <section key={group.day} aria-label={label} className="flex flex-col gap-2">
                <p className="self-center rounded-full bg-zinc-100 px-3 py-0.5 text-xs font-medium text-zinc-600">
                  {label}
                </p>
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    body={message.body}
                    createdAt={message.created_at}
                    mine={message.sender_id === myId}
                  />
                ))}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
