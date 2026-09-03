import type { ReactNode } from "react";

import type { Player } from "@/lib/data/players";
import { calculateAge } from "@/lib/format/age";
import { POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/format/playerLabels";

type Props = {
  player: Player;
  // Slots para T04d (trayectoria) y T06b (estadísticas) — esos tickets
  // todavía no existen, así que quedan como huecos identificados en vez de
  // renderizar algo a medias (FUT-87, fuera de alcance).
  careerSlot?: ReactNode;
  statsSlot?: ReactNode;
};

export default function PlayerProfileDetails({
  player,
  careerSlot,
  statsSlot,
}: Props) {
  const age = calculateAge(player.birth_date);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Posición</dt>
          <dd className="font-medium text-zinc-900">
            {player.position ? POSITION_LABELS[player.position as keyof typeof POSITION_LABELS] : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Pierna hábil</dt>
          <dd className="font-medium text-zinc-900">
            {player.preferred_foot
              ? PREFERRED_FOOT_LABELS[player.preferred_foot as keyof typeof PREFERRED_FOOT_LABELS]
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Edad</dt>
          <dd className="font-medium text-zinc-900">
            {age !== null ? `${age} años` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Altura</dt>
          <dd className="font-medium text-zinc-900">
            {player.height_cm ? `${player.height_cm} cm` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Peso</dt>
          <dd className="font-medium text-zinc-900">
            {player.weight_kg ? `${player.weight_kg} kg` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ubicación</dt>
          <dd className="font-medium text-zinc-900">
            {player.city || player.province
              ? [player.city, player.province].filter(Boolean).join(", ")
              : "—"}
          </dd>
        </div>
      </dl>

      {player.is_seeking_team ? (
        <span className="inline-flex w-fit items-center rounded-full border border-brand-tint-border bg-brand-tint px-3 py-1 text-xs font-medium text-zinc-900">
          Busca equipo
        </span>
      ) : null}

      {player.bio ? <p className="text-sm text-zinc-700">{player.bio}</p> : null}

      {careerSlot}
      {statsSlot}
    </div>
  );
}
