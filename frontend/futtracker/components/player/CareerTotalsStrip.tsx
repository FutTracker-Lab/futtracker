import type { ReactNode } from "react";

import type { PlayerCareerTotals } from "@/lib/data/stats";
import { formatGoalsPerMatch, formatInteger } from "@/lib/format/numbers";

type Props = {
  totals: PlayerCareerTotals | null;
  // "Totales de carrera" en la franja del perfil público y en "Partidos
  // cargados" (requisito 8 de FUT-92); un título distinto no hace falta hoy.
  title?: string;
  description?: string;
  // El botón "+ Cargar partido" del diseño: solo lo pasa el dueño desde la
  // pantalla de gestión, nunca el perfil público de un visitante.
  action?: ReactNode;
};

/**
 * Los cuatro números de `player_career_totals`, siempre leídos de la vista
 * (nota técnica del ticket: el frontend no vuelve a sumar partidos). Vive en
 * `components/player` porque lo usan dos pantallas de dos features distintas
 * (T04d/T06b): el perfil público y "Partidos cargados".
 */
export default function CareerTotalsStrip({
  totals,
  title = "Totales de carrera",
  description,
  action,
}: Props) {
  const matches = totals?.total_matches ?? 0;
  const goals = totals?.total_goals ?? 0;
  const assists = totals?.total_assists ?? 0;
  // La vista ya trae `goals_per_match` calculado: se lee tal cual (nota
  // técnica del ticket, "el frontend no vuelve a sumar partidos por su
  // cuenta"), no se recalcula acá.
  const goalsPerMatch = totals?.goals_per_match ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {description ? (
            <p className="text-sm text-zinc-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Partidos" value={formatInteger(matches)} />
        <Stat label="Goles" value={formatInteger(goals)} />
        <Stat label="Asistencias" value={formatInteger(assists)} />
        <Stat label="Goles por partido" value={formatGoalsPerMatch(goalsPerMatch)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-2xl font-bold text-zinc-900">{value}</span>
    </div>
  );
}
