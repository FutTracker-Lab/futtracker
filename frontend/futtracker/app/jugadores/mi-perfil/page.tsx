import { redirect } from "next/navigation";
import Link from "next/link";

import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import { getPlayerById } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";

// proxy.ts ya protege /jugadores/**, pero acá necesitamos el id del usuario
// para resolver "mi-perfil" a una fila concreta, no alcanza con saber que
// hay sesión.
export default async function MyPlayerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/jugadores/mi-perfil");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "player") {
    // El usuario logueado no tiene rol "player" (ej. es delegado). No es un
    // 404: es la ruta equivocada para esta cuenta.
    redirect("/");
  }

  const player = await getPlayerById(supabase, user.id);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <PlayerProfileHeader profile={profile} isOwner hasPlayerRow={player !== null} />
        <Link
          href="/jugadores/mi-perfil/editar"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          {player ? "Editar perfil" : "Completá tu perfil"}
        </Link>
      </div>
      {player ? <PlayerProfileDetails player={player} /> : null}
    </div>
  );
}
