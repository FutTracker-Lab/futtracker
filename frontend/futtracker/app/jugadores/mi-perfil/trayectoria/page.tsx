import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import CareerTimeline from "@/components/player/CareerTimeline";
import CareerTimelineSkeleton from "@/components/player/CareerTimelineSkeleton";
import { getPlayerProfileById } from "@/lib/data/profiles";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu trayectoria · FutTracker" };

// Pantalla propia y no una sección más de /jugadores/mi-perfil: en el kit de
// diseño (ScreenTrayectoria.jsx, rotulada T04D) "Mi perfil" y "Trayectoria"
// son dos entradas distintas del sidebar. La CTA del requisito 6 apunta a
// `${career}/nueva`, que confirma que la trayectoria propia cuelga de acá.
//
// El perfil público (/jugadores/[id]) sigue mostrando la misma sección: esa
// es la vista que escanea el delegado. Esta es la del dueño.
export default async function MyCareerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.career}`);
  }

  const data = await getPlayerProfileById(user.id);

  if (!data) {
    // Mismo criterio que /jugadores/mi-perfil: la cuenta no tiene rol
    // "player" (ej. es delegado). No es un 404, es la ruta equivocada.
    redirect("/");
  }

  const { player } = data;

  if (!player) {
    // Sin fila de jugador no hay trayectoria posible todavía: primero tiene
    // que completar el perfil, que es lo que ya resuelve esa pantalla.
    redirect(RouteConstants.profile.edit);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">Tu trayectoria</h1>
        <p className="text-sm text-zinc-500">
          Los clubes la miran antes que cualquier otra cosa. Podés cargar
          etapas que se solapen.
        </p>
      </div>

      <Suspense fallback={<CareerTimelineSkeleton />}>
        <CareerTimeline playerId={player.id} isOwner />
      </Suspense>
    </div>
  );
}
