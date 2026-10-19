export default function VacancyBoardSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <div className="flex animate-pulse flex-col gap-2">
          <div className="h-8 w-40 rounded bg-zinc-200" />
          <div className="h-4 w-56 max-w-full rounded bg-zinc-200" />
        </div>
        <ul aria-label="Cargando" className="flex animate-pulse flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-md bg-zinc-200" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-40 max-w-full rounded bg-zinc-200" />
                  <div className="h-3 w-24 rounded bg-zinc-200" />
                </div>
              </div>
              <div className="h-3 w-64 max-w-full rounded bg-zinc-200" />
              <div className="ml-auto h-8 w-48 max-w-full rounded bg-zinc-200" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
