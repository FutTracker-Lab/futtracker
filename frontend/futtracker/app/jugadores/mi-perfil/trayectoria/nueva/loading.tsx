// Segmento sin `notFound()` en ningún descendiente (es una hoja), así que un
// `loading.tsx` acá no tiene el problema descrito en
// `app/jugadores/[id]/page.tsx` (el status 404 que deja de poder cambiarse
// una vez que arrancó el streaming).
export default function NewCareerEntryLoading() {
  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-6">
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="h-8 w-72 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100" />
        </div>
        <div
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          aria-hidden="true"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-9 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-9 w-full animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}
