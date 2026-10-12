export default function HighlightsSkeleton() {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      aria-hidden="true"
    >
      <div className="mb-4 flex flex-col gap-2">
        <div className="h-5 w-36 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            // Dos filas en las dos grillas: a una columna sobran los dos últimos.
            className={`h-14 animate-pulse rounded-lg bg-zinc-200 ${i > 1 ? "hidden sm:block" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
