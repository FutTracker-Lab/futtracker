import Link from "next/link";
import type { ReactNode } from "react";

import TeamCrest from "@/components/vacancies/TeamCrest";
import { SECONDARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import type { OpenVacancy } from "@/lib/data/vacancies";
import { formatShortDate } from "@/lib/format/dates";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { getLevelLabel, getModalityLabel } from "@/lib/format/vacancyLabels";
import { RouteConstants } from "@/lib/routes";

type Props = {
  vacancy: OpenVacancy & { teams: NonNullable<OpenVacancy["teams"]> };
  crestUrl: string | null;
  action: ReactNode;
};

export default function VacancyCard({ vacancy, crestUrl, action }: Props) {
  const team = vacancy.teams;

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <TeamCrest teamName={team.name} crestUrl={crestUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-semibold break-words text-zinc-900">{team.name}</h2>
          {team.city ? <p className="text-sm text-zinc-500">{team.city}</p> : null}
        </div>
        <p className="shrink-0 text-xs text-zinc-500">
          Publicada el {formatShortDate(vacancy.created_at)}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium text-zinc-900">
          {getPositionLabel(vacancy.position) ?? vacancy.position}
        </p>
        <p className="text-sm text-zinc-700">
          {getModalityLabel(vacancy.modality)} · {getLevelLabel(vacancy.level)}
        </p>
        {vacancy.description ? (
          <p className="text-sm break-words text-zinc-600">{vacancy.description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={RouteConstants.team.view(team.id)} className={SECONDARY_BUTTON_CLASS}>
          Ver equipo
        </Link>
        {action}
      </div>
    </li>
  );
}
