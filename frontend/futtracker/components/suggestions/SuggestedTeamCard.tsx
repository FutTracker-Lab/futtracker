import Link from "next/link";

import ApplyButton from "@/components/vacancies/ApplyButton";
import TeamCrest from "@/components/vacancies/TeamCrest";
import { LINK_CLASS, SUCCESS_CHIP_CLASS } from "@/components/vacancies/styles";
import type { SuggestionRow } from "@/lib/data/suggestions";
import { formatDistanceKm } from "@/lib/format/numbers";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { seekingPositionLabel } from "@/lib/format/suggestionLabels";
import { getLevelLabel, getModalityLabel } from "@/lib/format/vacancyLabels";
import { RouteConstants } from "@/lib/routes";

type Props = { suggestion: SuggestionRow; crestUrl: string | null };

export default function SuggestedTeamCard({ suggestion, crestUrl }: Props) {
  const positionLabel = getPositionLabel(suggestion.position) ?? suggestion.position;
  const teamDetails = [suggestion.city, suggestion.category].filter(Boolean).join(" · ");

  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <TeamCrest teamName={suggestion.team_name} crestUrl={crestUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-semibold break-words text-zinc-900">{suggestion.team_name}</h2>
          {teamDetails ? <p className="text-sm text-zinc-500">{teamDetails}</p> : null}
        </div>
        <p className="shrink-0 text-sm font-medium text-zinc-700">
          {formatDistanceKm(suggestion.distance_km)}
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className={SUCCESS_CHIP_CLASS}>{seekingPositionLabel(positionLabel)}</span>
        <p className="text-sm text-zinc-700">
          {getModalityLabel(suggestion.modality)} · {getLevelLabel(suggestion.level)}
        </p>
        {suggestion.description ? (
          <p className="text-sm break-words text-zinc-600">{suggestion.description}</p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-4">
        <ApplyButton
          vacancyId={suggestion.vacancy_id}
          positionLabel={positionLabel}
          teamName={suggestion.team_name}
          applied={suggestion.applied}
        />
        <Link href={RouteConstants.team.view(suggestion.team_id)} className={LINK_CLASS}>
          Ver equipo
        </Link>
      </div>
    </li>
  );
}
