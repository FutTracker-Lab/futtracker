"use client";

export default function PlayerProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <p className="text-sm text-zinc-700">Ocurrió un error al cargar el perfil.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        Reintentar
      </button>
    </div>
  );
}
