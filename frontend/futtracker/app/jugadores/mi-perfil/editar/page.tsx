import { redirect } from "next/navigation";

import PlayerProfileForm from "./PlayerProfileForm";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { listZones } from "@/lib/data/zones";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function EditPlayerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.edit}`);
  }

  // Después del chequeo de sesión: a un visitante no le llega ninguna zona.
  const [data, zones] = await Promise.all([
    getPlayerProfileById(user.id),
    listZones(supabase).catch(() => []),
  ]);

  if (!data) {
    redirect("/");
  }

  const { profile, player, avatarUrl } = data;

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {player ? "Editar perfil" : "Completá tu perfil"}
          </h1>
          <p className="text-sm text-zinc-600">
            Los clubes filtran por posición, zona y horarios. Sin esos campos
            no aparecés en las búsquedas.
          </p>
        </div>

        <PlayerProfileForm
          initialFullName={profile.full_name}
          initialPlayer={player}
          initialAvatarUrl={avatarUrl}
          initialAvatarPath={profile.avatar_path}
          userId={user.id}
          zones={zones}
        />
      </div>
    </div>
  );
}
