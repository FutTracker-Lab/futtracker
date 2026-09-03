import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import { getPlayerById } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/jugadores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();

  return { title: profile?.full_name ?? "FutTracker" };
}

// La ruta ya está protegida por proxy.ts (redirige a /login sin sesión), así
// que acá solo falta resolver si el visitante es el dueño del perfil, para
// mostrar el botón de editar.
export default async function PlayerProfilePage({
  params,
}: PageProps<"/jugadores/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "player")
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const player = await getPlayerById(supabase, id);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === profile.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <PlayerProfileHeader profile={profile} isOwner={isOwner} hasPlayerRow={player !== null} />
        {isOwner ? (
          <Link
            href="/jugadores/mi-perfil/editar"
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            {player ? "Editar perfil" : "Completá tu perfil"}
          </Link>
        ) : null}
      </div>
      {player ? <PlayerProfileDetails player={player} /> : null}
    </div>
  );
}
