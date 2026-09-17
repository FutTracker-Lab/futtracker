import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import CareerEntryForm from "@/app/jugadores/mi-perfil/trayectoria/CareerEntryForm";
import { getCareerEntryById } from "@/lib/data/careerEntries";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar entrada · Trayectoria" };

// Sin `loading.tsx` en este segmento a propósito (mismo motivo que
// /jugadores/[id]/page.tsx): un `loading.tsx` abre un boundary de Suspense y
// el `notFound()` de acá abajo ya no puede cambiar el status de la
// respuesta, que empezaría a streamear como 200.
export default async function EditCareerEntryPage({
  params,
}: PageProps<"/jugadores/mi-perfil/trayectoria/[entryId]/editar">) {
  const { entryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${RouteConstants.profile.careerEdit(entryId)}`);
  }

  const entry = await getCareerEntryById(supabase, entryId);

  // Requisito 10: las rutas son solo del dueño. Una etapa ajena (o
  // inexistente) es 404, no 403 — un 403 confirmaría que esa etapa existe.
  if (!entry || entry.player_id !== user.id) {
    notFound();
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Editar {entry.club_name}
          </h1>
          <p className="text-sm text-zinc-600">
            Los partidos ya cargados se validan contra el nuevo período: si
            alguno queda afuera, primero hay que editarlo o borrarlo.
          </p>
        </div>

        <CareerEntryForm entry={entry} />
      </div>
    </div>
  );
}
