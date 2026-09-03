export default function PlayerProfileLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-6 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-zinc-200" />
        <div className="h-5 w-40 rounded bg-zinc-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-zinc-200" />
        ))}
      </div>
    </div>
  );
}
