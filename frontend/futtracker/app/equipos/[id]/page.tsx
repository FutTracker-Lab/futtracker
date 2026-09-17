import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import TeamProfileDetails from "@/components/team/TeamProfileDetails";
import TeamProfileHeader from "@/components/team/TeamProfileHeader";
import { getTeamProfileById } from "@/lib/data/teamProfiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/equipos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getTeamProfileById(id);

  return { title: data?.team.name ?? "FutTracker" };
}

// Sin `loading.tsx` en este segmento a propósito, aunque el requisito 9 pida
// skeleton: un `loading.tsx` abre un boundary de Suspense, la respuesta
// empieza a streamear como 200 y el `notFound()` posterior ya no puede
// cambiar el status (ver node_modules/next/dist/docs/.../not-found.md, "The
// trade-off is the HTTP status code"). El criterio de aceptación pide 404
// real para un id inexistente, y eso solo se consigue resolviendo antes de
// que arranque el stream. Las rutas que no llaman a `notFound()`
// (/equipos/mi-equipo) sí conservan su skeleton.
//
// La ruta ya está protegida por proxy.ts (redirige a /login sin sesión), así
// que acá solo falta resolver si el visitante es el dueño, para mostrarle el
// botón de editar.
export default async function TeamProfilePage({
  params,
}: PageProps<"/equipos/[id]">) {
  const { id } = await params;
  const data = await getTeamProfileById(id);

  if (!data) {
    notFound();
  }

  const { team, ownerName, crestUrl } = data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === team.owner_id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TeamProfileHeader team={team} ownerName={ownerName} crestUrl={crestUrl} />
        {isOwner ? (
          <Link
            href={RouteConstants.team.edit(team.id)}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Editar equipo
          </Link>
        ) : null}
      </div>
      <TeamProfileDetails team={team} />
    </div>
  );
}
