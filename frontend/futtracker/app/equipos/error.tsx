"use client";

/**
 * Boundary de error de todas las pantallas de equipo.
 *
 * `getTeamProfileById` y `getTeamById` propagan el error de Supabase en vez
 * de devolver `null` — así un fallo transitorio no se confunde con un 404 —, y
 * este archivo es lo que lo convierte en una pantalla con "Reintentar" en
 * lugar de la genérica de Next. `reset()` vuelve a renderizar el segmento.
 */
export default function TeamError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <p className="text-sm text-zinc-700">
        Ocurrió un error al cargar el equipo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        Reintentar
      </button>
    </div>
  );
}
