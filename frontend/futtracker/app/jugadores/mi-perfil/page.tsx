import { redirect } from "next/navigation";
import Link from "next/link";

import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// Sin `loading.tsx` en este segmento a propósito, y eso vale para todo lo que
// cuelga de /jugadores/mi-perfil: un `loading.tsx` abre un boundary de
// Suspense para sí mismo Y para sus rutas hijas, así que la respuesta empieza
// a streamear como 200 y el `notFound()` de las rutas de trayectoria ya no
// puede cambiar el status. El requisito 10 de FUT-92 pide que un `entryId`
// ajeno no se encuentre, y con el skeleton acá devolvía 200. Mismo criterio
// que /equipos/[id] y /jugadores/[id]: se prioriza el status real.
//
// proxy.ts ya protege /jugadores/**, pero acá necesitamos el id del usuario
// para resolver "mi-perfil" a una fila concreta, no alcanza con saber que
// hay sesión.
export default async function MyPlayerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.mine}`);
  }

  const data = await getPlayerProfileById(user.id);

  if (!data) {
    // El usuario logueado no tiene rol "player" (ej. es delegado). No es un
    // 404: es la ruta equivocada para esta cuenta.
    redirect("/");
  }

  const { profile, player, avatarUrl } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PlayerProfileHeader
          profile={profile}
          isOwner
          hasPlayerRow={player !== null}
          avatarUrl={avatarUrl}
        />
        <Link
          href={RouteConstants.profile.edit}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          {player ? "Editar perfil" : "Completá tu perfil"}
        </Link>
      </div>
      {player ? <PlayerProfileDetails player={player} /> : null}
    </div>
  );
}
