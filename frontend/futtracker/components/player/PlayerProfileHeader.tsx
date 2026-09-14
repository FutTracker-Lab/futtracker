import { initialsOf } from "@/lib/format/initials";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

type Props = {
  profile: Profile;
  isOwner: boolean;
  hasPlayerRow: boolean;
};

// El avatar se renderiza con iniciales a propósito: T04a.2 (el bucket) no
// existe todavía, y el propio diseño ya define las iniciales como el estado
// sin foto ("TP" en ScreenPerfil.jsx) — no es un placeholder roto.
export default function PlayerProfileHeader({
  profile,
  isOwner,
  hasPlayerRow,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-brand-foreground"
      >
        {initialsOf(profile.full_name)}
      </div>
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
