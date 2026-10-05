import { notFound, redirect } from "next/navigation";

import TeamForm from "@/components/team/TeamForm";
import { getTeamProfileById } from "@/lib/data/teamProfiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function EditTeamPage({
  params,
}: PageProps<"/equipos/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.team.edit(id)}`);
  }

  const data = await getTeamProfileById(id);

  // Requisito 5: si no es el dueño, 404 y no 403. Un 403 confirmaría que ese
  // equipo existe; el 404 no dice nada. Tampoco un redirect silencioso, que
  // dejaría a QA sin poder distinguir el caso.
  if (!data || data.team.owner_id !== user.id) {
    notFound();
  }

  const { team, crestUrl } = data;

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Editar equipo
          </h1>
          <p className="text-sm text-zinc-600">
            Lo que edités acá es lo que ven los jugadores cuando les aparece el
            club en una búsqueda.
          </p>
        </div>

        <TeamForm team={team} initialCrestUrl={crestUrl} />
      </div>
    </div>
  );
}
