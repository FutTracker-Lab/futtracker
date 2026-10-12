export default function PlayerSearchSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl animate-pulse flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-56 rounded bg-zinc-200" />
          <div className="h-4 w-80 max-w-full rounded bg-zinc-200" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="h-72 rounded-xl bg-zinc-200" />
          <ul aria-label="Cargando resultados" className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-white p-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-200" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-40 rounded bg-zinc-200" />
                  <div className="h-3 w-64 max-w-full rounded bg-zinc-200" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
