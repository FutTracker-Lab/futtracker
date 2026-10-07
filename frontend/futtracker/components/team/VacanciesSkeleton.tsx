export default function VacanciesSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="h-5 w-32 rounded bg-zinc-200" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-zinc-100" />
      ))}
    </div>
  );
}
