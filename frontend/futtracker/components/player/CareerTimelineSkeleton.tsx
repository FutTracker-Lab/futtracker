// Skeleton propio del boundary de <Suspense> que envuelve a `CareerTimeline`
// en /jugadores/[id]/page.tsx. El encabezado del perfil ya resolvió cuando
// esto se muestra (nota técnica de FUT-91: "el encabezado pinta antes de que
// resuelva el skeleton del timeline"), así que solo bloquea esta sección.
export default function CareerTimelineSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      aria-hidden="true"
    >
      <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 pb-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-3 w-56 animate-pulse rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}
