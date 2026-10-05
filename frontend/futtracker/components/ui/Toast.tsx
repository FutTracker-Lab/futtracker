"use client";

import { useEffect, useState } from "react";

/**
 * Aviso efímero de éxito. `role="status"` y no `alert` para que el lector de
 * pantalla lo anuncie sin interrumpir lo que esté leyendo.
 *
 * Se monta cuando hay algo que avisar y se esconde solo; para mostrarlo otra
 * vez, quien lo usa le cambia la `key` (un guardado nuevo es un toast nuevo).
 */
export default function Toast({
  message,
  durationMs = 4000,
}: {
  message: string;
  durationMs?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}
