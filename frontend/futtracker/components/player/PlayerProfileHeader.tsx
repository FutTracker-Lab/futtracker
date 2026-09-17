import Image from "next/image";
import type { ReactNode } from "react";

import type { Player } from "@/lib/data/players";
import { calculateAge } from "@/lib/format/age";
import { initialsOf } from "@/lib/format/initials";
import {
  getPositionAbbreviation,
  getPositionLabel,
  getPreferredFootLabel,
} from "@/lib/format/playerLabels";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

type Props = {
  profile: Profile;
  // Null mientras la cuenta no completó su ficha de jugador: ahí el
  // encabezado se queda en el nombre y el aviso.
  player: Player | null;
  isOwner: boolean;
  // URL firmada de 24 h generada en el servidor (nunca la URL directa del
  // bucket, que es privado). Null mientras el jugador no subió foto: ahí el
  // diseño muestra las iniciales, no un placeholder roto.
  avatarUrl: string | null;
  // Botonera de la derecha ("Editar perfil"): la arma cada página, porque el
  // perfil público no muestra lo mismo que el propio.
  actions?: ReactNode;
};

// Los datos sueltos de la fila de abajo del nombre. El diseño los muestra en
// una sola línea separados por puntos, no en la grilla de etiqueta/valor que
// tenía antes: son cuatro datos cortos y una grilla de seis celdas les daba
// un peso que no tienen.
function MetaItem({ children }: { children: ReactNode }) {
  return <span className="text-sm text-zinc-500">{children}</span>;
}

export default function PlayerProfileHeader({
  profile,
  player,
  isOwner,
  avatarUrl,
  actions,
}: Props) {
  const age = player ? calculateAge(player.birth_date) : null;
  const abbreviation = player ? getPositionAbbreviation(player.position) : null;
  const footLabel = player ? getPreferredFootLabel(player.preferred_foot) : null;
  const location = player
    ? [player.city, player.province].filter(Boolean).join(", ")
    : "";

  const meta = [
    location || null,
    age !== null ? `${age} años` : null,
    footLabel ? `Pie ${footLabel.toLowerCase()}` : null,
    player?.height_cm ? `${(player.height_cm / 100).toFixed(2)} m` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Foto de perfil de ${profile.full_name}`}
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
            // El bucket es privado y la URL viene firmada por 24 h: no tiene
            // sentido que el optimizador de Next la cachee más que eso.
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl font-semibold text-brand"
          >
            {initialsOf(profile.full_name)}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              {profile.full_name}
            </h1>
            {isOwner ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                Vos
              </span>
            ) : null}
          </div>

          {abbreviation ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                title={getPositionLabel(player?.position ?? null) ?? undefined}
                className="inline-flex items-center rounded-md bg-brand px-2 py-1 text-xs font-semibold tracking-wide text-brand-foreground"
              >
                {abbreviation}
              </span>
              {player?.is_seeking_team ? (
                <span className="inline-flex items-center rounded-full border border-brand-tint-border bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-brand">
                  Busca equipo
                </span>
              ) : null}
            </div>
          ) : null}

          {meta.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {meta.map((item, index) => (
                <span key={item} className="flex items-center gap-3">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-zinc-300">
                      ·
                    </span>
                  ) : null}
                  <MetaItem>{item}</MetaItem>
                </span>
              ))}
            </div>
          ) : null}

          {!player ? (
            <p className="text-sm text-zinc-500">
              {isOwner
                ? "Todavía no completaste tu perfil."
                : "Este jugador todavía no completó su perfil."}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
