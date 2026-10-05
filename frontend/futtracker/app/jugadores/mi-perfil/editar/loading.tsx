export default function EditPlayerProfileLoading() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-6 p-6">
        <div className="h-9 w-64 rounded bg-zinc-200" />
        {Array.from({ length: 2 }).map((_, card) => (
          <div
            key={card}
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6"
          >
            <div className="h-5 w-40 rounded bg-zinc-200" />
            {Array.from({ length: 3 }).map((_, field) => (
              <div key={field} className="h-10 rounded bg-zinc-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
