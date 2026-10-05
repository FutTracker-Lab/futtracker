import { redirect } from "next/navigation";

import TeamForm from "@/components/team/TeamForm";
import { getMyTeam } from "@/lib/data/teams";
import { getProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function NewTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.team.new}`);
  }

  const profile = await getProfileById(user.id);

  // Requisito 10: una cuenta de jugador ve el mensaje de permiso, no el
  // formulario. No es un 404 — la ruta existe, es esta cuenta la que no puede
  // usarla.
  if (profile?.role !== "delegate") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-6">
        <h1 className="text-xl font-semibold text-zinc-900">
          Solo los delegados pueden crear equipos
        </h1>
        <p className="text-sm text-zinc-600">
          Tu cuenta es de jugador. El rol se elige al registrarse y no se puede
          cambiar después.
        </p>
      </div>
    );
  }

  // Requisito 6: el `unique` de `owner_id` nunca debería llegar a dispararse
  // desde la UI, así que el delegado que ya tiene equipo vuelve a su pantalla
  // con un aviso en vez de ver el formulario.
  const myTeam = await getMyTeam(supabase);

  if (myTeam) {
    redirect(`${RouteConstants.team.mine}?aviso=equipo-existente`);
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Creá tu equipo
          </h1>
          <p className="text-sm text-zinc-600">
            Los jugadores filtran por categoría, zona y liga. Sin esos campos tu
            club no aparece en las búsquedas.
          </p>
        </div>

        <TeamForm team={null} initialCrestUrl={null} />
      </div>
    </div>
  );
}
