import { redirect } from "next/navigation";

import { getDefaultCareerEntryIdForCurrentUser } from "@/app/jugadores/mi-perfil/trayectoria/actions";
import { RouteConstants } from "@/lib/routes";

/**
 * Destino de "Partidos cargados" en el sidebar (ScreenPartidos.jsx). El CRUD
 * de partidos cuelga de una etapa puntual (requisito 3: `.../[entryId]/
 * partidos`), así que esta ruta sin id no tiene nada propio que mostrar: solo
 * resuelve a qué etapa ir y redirige.
 *
 * Decisión propia (no está en el ticket): la etapa vigente si hay una, si no
 * la más reciente por fecha de inicio. Sin ninguna etapa todavía, vuelve a
 * la trayectoria para que el jugador cree la primera.
 */
export default async function CareerMatchesIndexPage() {
  const entryId = await getDefaultCareerEntryIdForCurrentUser();

  redirect(
    entryId
      ? RouteConstants.profile.careerMatches(entryId)
      : RouteConstants.profile.career,
  );
}
