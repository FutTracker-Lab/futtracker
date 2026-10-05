import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import MatchStatsForm from "@/app/jugadores/mi-perfil/trayectoria/MatchStatsForm";
import { getCareerEntryById } from "@/lib/data/careerEntries";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cargar partido · FutTracker" };

// Sin `loading.tsx`: mismo motivo que el resto de las rutas bajo [entryId].
export default async function NewMatchStatPage({
  params,
}: PageProps<"/jugadores/mi-perfil/trayectoria/[entryId]/partidos/nuevo">) {
  const { entryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${RouteConstants.profile.careerMatchNew(entryId)}`,
    );
  }

  const entry = await getCareerEntryById(supabase, entryId);

  if (!entry || entry.player_id !== user.id) {
    notFound();
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Cargar partido
          </h1>
          <p className="text-sm text-zinc-600">{entry.club_name}</p>
        </div>

        <MatchStatsForm
          careerEntryId={entryId}
          entryPosition={entry.position}
          match={null}
        />
      </div>
    </div>
  );
}
