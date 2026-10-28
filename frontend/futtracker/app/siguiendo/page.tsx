import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getVacanciesAccess } from "@/app/vacantes/access";
import FollowedTeamsList from "@/components/team/FollowedTeamsList";
import FollowingFrame from "@/components/team/FollowingFrame";
import { loadFollowedTeams } from "@/components/team/followedTeams";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Siguiendo" };

export default async function FollowingPage() {
  // El layout corre en paralelo: sin esto, el 404 del delegado igual trae los datos en el payload.
  const access = await getVacanciesAccess();

  if (access === "unavailable") {
    throw new Error("No se pudo leer el rol");
  }

  if (access !== "player") {
    notFound();
  }

  const supabase = await createClient();
  const teams = await loadFollowedTeams(supabase);

  return (
    <FollowingFrame>
      <FollowedTeamsList teams={teams} />
    </FollowingFrame>
  );
}
