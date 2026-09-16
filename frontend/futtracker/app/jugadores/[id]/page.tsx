import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/jugadores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getPlayerProfileById(id);

  return { title: data?.profile.full_name ?? "FutTracker" };
}

// Sin `loading.tsx` en este segmento a propósito: un `loading.tsx` abre un
// boundary de Suspense, la respuesta empieza a streamear como 200 y el
// `notFound()` posterior ya no puede cambiar el status. El criterio de
// aceptación de FUT-87 pide 404 real para un id inexistente, y eso solo se
// consigue resolviendo antes de que arranque el stream. Las rutas que no
// llaman a `notFound()` (/jugadores/mi-perfil) sí conservan su skeleton.
//
// La ruta ya está protegida por proxy.ts (redirige a /login sin sesión), así
// que acá solo falta resolver si el visitante es el dueño del perfil, para
// mostrar el botón de editar.
export default async function PlayerProfilePage({
  params,
}: PageProps<"/jugadores/[id]">) {
  const { id } = await params;
  const data = await getPlayerProfileById(id);

  if (!data) {
    notFound();
  }

  const { profile, player, avatarUrl } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PlayerProfileHeader
          profile={profile}
          isOwner={isOwner}
          hasPlayerRow={player !== null}
          avatarUrl={avatarUrl}
        />
        {isOwner ? (
          <Link
            href={RouteConstants.profile.edit}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            {player ? "Editar perfil" : "Completá tu perfil"}
          </Link>
        ) : null}
      </div>
      {player ? <PlayerProfileDetails player={player} /> : null}
    </div>
  );
}
