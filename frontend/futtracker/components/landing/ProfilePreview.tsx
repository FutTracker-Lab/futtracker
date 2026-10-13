const STATS = [
  { value: 28, label: "Partidos" },
  { value: 9, label: "Goles" },
  { value: 14, label: "Asistencias" },
];

export default function ProfilePreview() {
  return (
    <figure className="w-full max-w-md">
      <div className="rounded-xl bg-white p-5 text-zinc-900 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-tint font-semibold text-brand">
            TP
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Tomás Peralta</p>
            <p className="text-xs text-zinc-500">
              Villa Urquiza, CABA · 26 años
            </p>
          </div>
          <span className="rounded-md bg-brand px-2.5 py-1 text-lg font-bold text-brand-foreground">
            7,6
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <span className="rounded bg-navy px-2.5 py-0.5 text-xs font-semibold text-white">
            LD
          </span>
          <span className="rounded border border-brand px-2.5 py-0.5 text-xs font-semibold text-brand">
            MC
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-y border-zinc-200 py-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="text-xs text-zinc-500">{stat.label}</dt>
              <dd className="text-xl font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-brand-tint p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold whitespace-nowrap text-brand-foreground">
            92 %
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Club Atlético del Parque busca tu posición
            </p>
            <p className="text-xs text-zinc-600">
              Compatibilidad alta · Martes y jueves, 20:00
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-panel-muted">
        Vista previa con datos de ejemplo
      </figcaption>
    </figure>
  );
}
