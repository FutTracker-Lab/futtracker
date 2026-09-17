import { redirect } from "next/navigation";
import Link from "next/link";

import PlayerAttributesCard from "@/components/player/PlayerAttributesCard";
import PlayerPresentationCard from "@/components/player/PlayerPresentationCard";
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
    // Fondo gris con tarjetas blancas y ancho amplio, como el diseño. Antes
    // era una columna angosta centrada (`max-w-2xl`) con los datos sueltos
    // sobre el fondo, sin tarjetas.
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <PlayerProfileHeader
            profile={profile}
            player={player}
            isOwner
            avatarUrl={avatarUrl}
            actions={
              <Link
                href={RouteConstants.profile.edit}
                className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
              >
                {player ? "Editar perfil" : "Completá tu perfil"}
              </Link>
            }
          />
        </div>

        {player ? (
          // Dos columnas como el diseño: la presentación ocupa el ancho y la
          // ficha queda al costado. En mobile se apilan.
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <PlayerPresentationCard player={player} isOwner />
            <PlayerAttributesCard player={player} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
