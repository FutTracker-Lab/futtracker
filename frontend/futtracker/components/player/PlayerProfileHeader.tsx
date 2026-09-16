import Image from "next/image";

import { initialsOf } from "@/lib/format/initials";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

type Props = {
  profile: Profile;
  isOwner: boolean;
  hasPlayerRow: boolean;
  // URL firmada de 24 h generada en el servidor (nunca la URL directa del
  // bucket, que es privado). Null mientras el jugador no subió foto: ahí el
  // diseño muestra las iniciales, no un placeholder roto.
  avatarUrl: string | null;
};

export default function PlayerProfileHeader({
  profile,
  isOwner,
  hasPlayerRow,
  avatarUrl,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`Foto de perfil de ${profile.full_name}`}
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-full object-cover"
          // El bucket es privado y la URL viene firmada por 24 h: no tiene
          // sentido que el optimizador de Next la cachee más que eso.
          unoptimized
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-brand-foreground"
        >
          {initialsOf(profile.full_name)}
        </div>
      )}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          {profile.full_name}
        </h1>
        {!hasPlayerRow ? (
          <p className="text-sm text-zinc-500">
            {isOwner
              ? "Todavía no completaste tu perfil."
              : "Este jugador todavía no completó su perfil."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
