import { redirect } from "next/navigation";

import PlayerProfileForm from "./PlayerProfileForm";
import { getPlayerById } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";

export default async function EditPlayerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/jugadores/mi-perfil/editar");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "player") {
    redirect("/");
  }

  const player = await getPlayerById(supabase, user.id);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-6 bg-white p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Editar perfil</h1>
      <PlayerProfileForm initialFullName={profile.full_name} initialPlayer={player} />
    </div>
  );
}
