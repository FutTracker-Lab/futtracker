"use client";

export default function HighlightsError() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-900">
        No pudimos cargar los highlights.
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
