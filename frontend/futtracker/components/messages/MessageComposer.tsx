"use client";

import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { sendMessageAction } from "@/app/mensajes/actions";
import Toast from "@/components/ui/Toast";
import { PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { MESSAGE_MAX_LENGTH, isSendableBody, messageLength } from "@/lib/data/messages";
import { MESSAGE_ERROR_TEXT } from "@/lib/format/messageLabels";

type Props = {
  conversationId: string;
};

type Notice = { message: string; at: number };

/**
 * La caja de texto (requisito 6): contador, Enter envía y Shift+Enter baja de
 * línea. Si el envío falla, el texto se queda en la caja.
 *
 * Valida con la misma regla que la base (`isSendableBody`): al menos un
 * caracter visible, y hasta 2000 contados por caracter, no por unidad UTF-16.
 * El contador muestra lo que se va a guardar, sin los espacios de las puntas,
 * así que el rojo y el botón deshabilitado siempre coinciden.
 */
export default function MessageComposer({ conversationId }: Props) {
  const [text, setText] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const counterId = useId();
  const errorId = useId();

  const length = messageLength(text);
  const canSend = isSendableBody(text) && !isPending;
  const overLimit = length > MESSAGE_MAX_LENGTH;

  function send() {
    if (!canSend) return;

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof sendMessageAction>>;

      try {
        result = await sendMessageAction(conversationId, text);
      } catch {
        result = { ok: false, error: "unexpected" };
      }

      if (result.ok) {
        setText("");
        setInlineError(null);
        textareaRef.current?.focus();
        return;
      }

      if (result.error === "invalidBody") {
        setInlineError(MESSAGE_ERROR_TEXT.invalidBody);
      } else {
        setNotice({ message: MESSAGE_ERROR_TEXT[result.error], at: Date.now() });
      }
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Mientras se compone con un IME (acentos en algunos teclados), Enter
    // confirma la letra, no envía.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className="border-t border-zinc-200 bg-white px-4 py-3 sm:px-6"
    >
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setInlineError(null);
          }}
          onKeyDown={onKeyDown}
          // De solo lectura mientras envía: al terminar se vacía, y lo que se
          // escribiera en el medio se perdería.
          readOnly={isPending}
          rows={2}
          aria-label="Escribí un mensaje"
          aria-describedby={inlineError ? `${counterId} ${errorId}` : counterId}
          aria-invalid={inlineError || overLimit ? true : undefined}
          placeholder="Escribí un mensaje"
          className="min-h-11 flex-1 resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <button type="submit" disabled={!canSend} className={PRIMARY_BUTTON_CLASS}>
          {isPending ? "Enviando…" : "Enviar"}
        </button>
      </div>
      <div className="mt-1 flex items-start justify-between gap-3">
        {inlineError ? (
          <p id={errorId} className="text-xs text-red-700">
            {inlineError}
          </p>
        ) : (
          <span />
        )}
        <p
          id={counterId}
          className={`shrink-0 text-xs ${overLimit ? "text-red-700" : "text-zinc-500"}`}
        >
          {length}/{MESSAGE_MAX_LENGTH}
        </p>
      </div>
      {notice ? <Toast key={notice.at} message={notice.message} tone="error" /> : null}
    </form>
  );
}
