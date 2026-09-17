"use client";

/**
 * Boundary de error de toda la gestión de trayectoria y partidos (requisito 9
 * de FUT-92). Un `error.tsx` no abre un boundary de Suspense —a diferencia de
 * `loading.tsx`— así que convive sin problema con los `notFound()` de las
 * rutas bajo `[entryId]` (mismo criterio que `app/equipos/error.tsx`, que
 * cubre `/equipos/[id]/editar` sin romper su 404).
 */
export default function CareerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center">
      <p className="text-sm text-zinc-700">
        Ocurrió un error al cargar tu trayectoria.
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
