import type { ReactNode } from "react";

import type { SeasonTotals } from "@/components/player/seasonTotalsView";
import { formatGoalsPerMatch, formatInteger } from "@/lib/format/numbers";

type Props = {
  seasons: SeasonTotals[];
};

// Íconos estilo lucide, inline para no sumar una librería.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TROPHY_ICON = (
  <Icon>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Icon>
);

const TARGET_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </Icon>
);

const SEND_ICON = (
  <Icon>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </Icon>
);

// Sin "Victorias" ni "+N este mes": discrepancias 2 y 3 de FUT-106.
export default function SeasonMetrics({ seasons }: Props) {
  const season = seasons.at(-1);
  if (!season) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold text-zinc-900">
          {`Temporada ${season.year}`}
        </h2>
        <p className="text-sm text-zinc-500">Sólo partidos con planilla cargada.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricBlock
          icon={TROPHY_ICON}
          value={formatInteger(season.matchesPlayed)}
          caption="Partidos"
        />
        <MetricBlock
          icon={TARGET_ICON}
          value={formatInteger(season.goals)}
          caption={`Goles · ${formatGoalsPerMatch(season.goalsPerMatch)} por partido`}
        />
        <MetricBlock
          icon={SEND_ICON}
          value={formatInteger(season.assists)}
          caption={`Asistencias · ${formatGoalsPerMatch(season.assistsPerMatch)} por partido`}
        />
      </div>
    </div>
  );
}

function MetricBlock({
  icon,
  value,
  caption,
}: {
  icon: ReactNode;
  value: string;
  caption: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-2xl font-bold text-zinc-900">{value}</span>
        <span className="text-sm text-zinc-500">{caption}</span>
      </div>
    </div>
  );
}
