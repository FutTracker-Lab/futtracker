// Requisito 9: 4 filas mientras carga la bandeja.
export default function InboxSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl animate-pulse flex-col gap-6 p-4 sm:p-6">
        <div className="h-8 w-40 rounded bg-zinc-200" />
        <ul aria-label="Cargando mensajes" className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
  );
}
