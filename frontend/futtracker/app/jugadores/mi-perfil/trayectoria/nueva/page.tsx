import { redirect } from "next/navigation";
import type { Metadata } from "next";

import CareerEntryForm from "@/app/jugadores/mi-perfil/trayectoria/CareerEntryForm";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva entrada · Trayectoria" };

export default async function NewCareerEntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.careerNew}`);
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Nueva entrada de trayectoria
          </h1>
          <p className="text-sm text-zinc-600">
            Cargá el club, la categoría y el período. Después vas a poder
            sumarle los partidos.
          </p>
        </div>

        <CareerEntryForm entry={null} />
      </div>
    </div>
  );
}
