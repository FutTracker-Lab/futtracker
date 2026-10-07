"use client";

import { useEffect, useState } from "react";

/**
 * Aviso efímero. El de éxito va con `role="status"` para que el lector de
 * pantalla lo anuncie sin interrumpir; el de error, con `alert`.
 *
 * Se monta cuando hay algo que avisar y se esconde solo; para mostrarlo otra
 * vez, quien lo usa le cambia la `key` (un guardado nuevo es un toast nuevo).
 */
export default function Toast({
  message,
  tone = "success",
  durationMs = 4000,
}: {
  message: string;
  tone?: "success" | "error";
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
      role={tone === "error" ? "alert" : "status"}
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-md px-4 py-2 text-sm font-medium text-white shadow-lg ${
        tone === "error" ? "bg-red-700" : "bg-zinc-900"
      }`}
    >
      {message}
    </div>
  );
}
