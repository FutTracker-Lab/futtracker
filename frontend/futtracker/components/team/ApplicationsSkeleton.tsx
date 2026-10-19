export default function ApplicationsSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="h-5 w-32 rounded bg-zinc-200" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-200" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-40 rounded bg-zinc-200" />
            <div className="h-3 w-56 max-w-full rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
