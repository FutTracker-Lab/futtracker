"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  // Los sin leer que tenía la conversación antes de marcarla como leída.
  unreadCount: number;
};

// El layout de /mensajes no se vuelve a renderizar al abrir el hilo: sin esto el badge de "Mensajes" queda viejo.
export default function RefreshNavBadges({ unreadCount }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (unreadCount > 0) {
      router.refresh();
    }
  }, [router, unreadCount]);

  return null;
}
