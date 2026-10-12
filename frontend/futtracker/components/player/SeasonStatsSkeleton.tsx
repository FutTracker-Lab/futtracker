export default function SeasonStatsSkeleton() {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      aria-hidden="true"
    >
      <div className="mb-4 flex flex-col gap-2">
        <div className="h-5 w-36 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4"
          >
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-zinc-100" />
            <div className="flex flex-col gap-2">
              <div className="h-6 w-10 animate-pulse rounded bg-zinc-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
