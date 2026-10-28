"use client";

import Link from "next/link";
import { useTransition } from "react";

import { unfollowTeamAction, type FollowActionResult } from "@/app/equipos/follow-actions";
import type { FollowedTeamItem } from "@/components/team/followedTeams";
import TeamCrest from "@/components/vacancies/TeamCrest";
import { SECONDARY_BUTTON_CLASS, SUCCESS_CHIP_CLASS } from "@/components/vacancies/styles";
import { unfollowButtonLabel } from "@/lib/format/followLabels";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

type Props = {
  team: FollowedTeamItem;
  onUnfollowed: (result: FollowActionResult) => void;
};

export default function FollowedTeamRow({ team, onUnfollowed }: Props) {
  const [isPending, startTransition] = useTransition();
  const details = [team.city, team.category].filter(Boolean).join(" · ");

  function unfollow() {
    if (isPending) return;

    startTransition(async () => {
      let result: FollowActionResult;

      try {
        result = await unfollowTeamAction(team.id);
      } catch {
        result = { ok: false, error: "unexpected" };
      }

      onUnfollowed(result);
    });
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <TeamCrest teamName={team.name} crestUrl={team.crestUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold break-words text-zinc-900">{team.name}</h2>
            {details ? <p className="text-sm text-zinc-600">{details}</p> : null}
          </div>
          {team.openPositions.length > 0 ? (
            <ul aria-label={`Vacantes abiertas de ${team.name}`} className="flex flex-wrap gap-2">
              {team.openPositions.map((position) => (
                <li key={position} className={SUCCESS_CHIP_CLASS}>
                  Busca {getPositionLabel(position) ?? position}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Sin vacantes abiertas</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={RouteConstants.team.view(team.id)} className={SECONDARY_BUTTON_CLASS}>
          Ver equipo
        </Link>
        <button
          type="button"
          onClick={unfollow}
          aria-label={unfollowButtonLabel(team.name)}
          aria-disabled={isPending}
          data-unfollow
          className={`${SECONDARY_BUTTON_CLASS} aria-disabled:cursor-wait aria-disabled:opacity-60`}
        >
          Dejar de seguir
        </button>
      </div>
    </li>
  );
}
