"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

// Para errores atrapados fuera de error.tsx, donde no hay `reset()`.
export default function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
    >
      Reintentar
    </button>
  );
}
