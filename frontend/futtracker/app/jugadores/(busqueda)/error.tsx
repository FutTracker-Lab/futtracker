"use client";

// `retry` y no `reset`: hay que volver a pedir los datos al servidor.
export default function PlayerSearchError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <p className="text-sm text-zinc-700">No pudimos buscar jugadores.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Reintentar
      </button>
    </div>
  );
}
