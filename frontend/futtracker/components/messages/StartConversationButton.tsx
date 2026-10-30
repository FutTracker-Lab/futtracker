"use client";

import { useState, useTransition } from "react";

import { startConversationAction } from "@/app/mensajes/actions";
import Toast from "@/components/ui/Toast";
import { PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { MESSAGE_ERROR_TEXT } from "@/lib/format/messageLabels";

type Props = {
  // La otra cuenta: el jugador del perfil o el delegado dueño del equipo.
  otherProfileId: string;
};

type Notice = { message: string; at: number };

/**
 * "Enviar mensaje" en los perfiles (requisito 1). Si sale bien, la acción
 * redirige al hilo; si no, vuelve con la clave del error y se avisa con un
 * toast. Deshabilitado mientras abre la conversación.
 */
export default function StartConversationButton({ otherProfileId }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof startConversationAction>> | undefined;

      try {
        result = await startConversationAction(otherProfileId);
      } catch {
        // La red o el servidor: sin esto, el error iría al error.tsx de toda la página.
        result = { ok: false, error: "unexpected" };
      }

      // Con éxito no vuelve: Next navega al hilo.
      if (result && !result.ok) {
        setNotice({ message: MESSAGE_ERROR_TEXT[result.error], at: Date.now() });
      }
    });
  }

  return (
    <>
      <button type="button" onClick={start} disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
        {isPending ? "Abriendo…" : "Enviar mensaje"}
      </button>
      {notice ? <Toast key={notice.at} message={notice.message} tone="error" /> : null}
    </>
  );
}
