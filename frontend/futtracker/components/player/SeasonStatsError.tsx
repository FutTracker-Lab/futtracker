"use client";

// `router.refresh()` deja la sección en error (ver `CareerTimelineError`).
export default function SeasonStatsError() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-900">
        No pudimos cargar las estadísticas.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-sm font-medium text-brand hover:underline"
      >
        Reintentar
      </button>
    </div>
  );
}
