import Image from "next/image";
import Link from "next/link";

import type { PlayerSearchRow } from "@/lib/data/players";
import { initialsOf } from "@/lib/format/initials";
import { formatCount, formatDistanceKm } from "@/lib/format/numbers";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

type Props = {
  player: PlayerSearchRow;
  avatarUrl: string | null;
};

export default function PlayerResultRow({ player, avatarUrl }: Props) {
  const positionLabel = getPositionLabel(player.position);
  const details = [
    player.is_seeking_team ? "Agente libre" : "No busca equipo",
    player.city,
    formatDistanceKm(player.distance_km),
    formatCount(player.matches_played, "partido", "partidos"),
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            // Firmada por 24 h: el optimizador de Next no la tiene que cachear.
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand"
          >
            {initialsOf(player.full_name)}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-900">{player.full_name}</p>
          <p className="text-sm text-zinc-600">{details.join(" · ")}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        {positionLabel ? (
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            {positionLabel}
          </span>
        ) : null}
        <Link
          href={RouteConstants.profile.view(player.player_id)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Ver perfil
        </Link>
      </div>
    </li>
  );
}
