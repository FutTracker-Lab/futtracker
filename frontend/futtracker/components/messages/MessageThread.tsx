"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";

import { loadOlderMessagesAction, type ThreadMessage } from "@/app/mensajes/actions";
import MessageBubble from "@/components/messages/MessageBubble";
import { mergeMessages } from "@/components/messages/mergeMessages";
import { SECONDARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { dayLabel, groupByDay } from "@/lib/format/messageLabels";

type Props = {
  conversationId: string;
  // Los últimos 50, del más viejo al más nuevo. Al enviar, el servidor los
  // vuelve a mandar (revalidatePath) con el mensaje nuevo al final.
  messages: ThreadMessage[];
  // Si hay mensajes anteriores a los que llegaron al abrir el hilo.
  hasMore: boolean;
  myId: string;
  otherName: string;
};

/**
 * El hilo (requisito 5): del más viejo al más nuevo, separado por día, con el
 * scroll en el último mensaje. "Ver mensajes anteriores" agrega arriba los 50
 * anteriores sin mover lo que se está leyendo.
 *
 * Guarda **todo** lo que ya conoce en una sola lista y le une lo que llega, sin
 * repetidos. Al enviar, el servidor manda la ventana de 50 corrida un lugar: el
 * que sale de esa ventana sigue en la lista, así que no queda un hueco. Si hay
 * anteriores se decide por el mensaje más viejo conocido, que no cambia al
 * enviar.
 */
export default function MessageThread({
  conversationId,
  messages,
  hasMore,
  myId,
  otherName,
}: Props) {
  const [known, setKnown] = useState(messages);
  const [latestFromServer, setLatestFromServer] = useState(messages);
  // Si ya no hay nada antes del mensaje más viejo de `known`.
  const [olderExhausted, setOlderExhausted] = useState(!hasMore);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Alto del contenido antes de agregar los anteriores, para compensar el scroll.
  const heightBeforePrepend = useRef<number | null>(null);

  // El servidor mandó una ventana nueva (se envió un mensaje): se une a lo que
  // ya había. Es el patrón de React para ajustar estado cuando cambia una prop,
  // sin un efecto que pinte dos veces.
  if (messages !== latestFromServer) {
    setLatestFromServer(messages);
    setKnown(mergeMessages(known, messages));
  }

  const firstId = known[0]?.id;
  const lastId = known[known.length - 1]?.id;

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
  }, [firstId]);

  function loadOlder() {
    const oldest = known[0];
    if (!oldest) return;

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof loadOlderMessagesAction>>;

      try {
        result = await loadOlderMessagesAction(conversationId, {
          created_at: oldest.created_at,
          id: oldest.id,
        });
      } catch {
        result = { ok: false };
      }

      if (!result.ok) {
        setLoadFailed(true);
        return;
      }

      setLoadFailed(false);
      heightBeforePrepend.current = scrollRef.current?.scrollHeight ?? null;
      setKnown((current) => mergeMessages(current, result.messages));
      setOlderExhausted(!result.hasMore);
    });
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      {!olderExhausted && known.length > 0 ? (
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
        {known.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-600">
            Escribile a {otherName} para empezar la conversación.
          </p>
        ) : (
          groupByDay(known).map((group) => {
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
