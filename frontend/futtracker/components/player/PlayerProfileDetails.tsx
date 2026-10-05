import type { ReactNode } from "react";

import type { Player } from "@/lib/data/players";

type Props = {
  player: Player;
  // Slots para T04d (trayectoria) y T06b (estadísticas) — esos tickets
  // todavía no existen, así que quedan como huecos identificados en vez de
  // renderizar algo a medias (FUT-87, fuera de alcance).
  careerSlot?: ReactNode;
  statsSlot?: ReactNode;
};

// La ficha quedó en el encabezado (PR #21): acá va lo que no muestra (FUT-111).
export default function PlayerProfileDetails({
  player,
  careerSlot,
  statsSlot,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      {player.weight_kg ? (
        <span className="inline-flex w-fit items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {player.weight_kg} kg
        </span>
      ) : null}

      {player.bio ? <p className="text-sm text-zinc-700">{player.bio}</p> : null}

      {careerSlot}
      {statsSlot}
    </div>
  );
}
