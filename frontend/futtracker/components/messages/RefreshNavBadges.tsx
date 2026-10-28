"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// El layout de /mensajes no se vuelve a renderizar al abrir el hilo: sin esto el badge de "Mensajes" queda viejo.
export default function RefreshNavBadges() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
