// Requisito 9: 6 burbujas mientras carga el hilo, alternando los lados.
export default function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-1 animate-pulse flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-zinc-200" />
          <div className="h-4 w-40 rounded bg-zinc-200" />
        </div>
        <ul aria-label="Cargando la conversación" className="flex flex-1 flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-10 w-48 max-w-[70%] rounded-2xl bg-zinc-200" />
            </li>
          ))}
        </ul>
        <div className="h-20 rounded-xl bg-zinc-200" />
      </div>
    </div>
  );
}
