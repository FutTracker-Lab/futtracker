import { RouteConstants } from "@/lib/routes";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";

// Requisito 7 de FUT-91: con más de 5 entradas, el resto queda detrás de
// "Ver trayectoria completa".
export const VISIBLE_ENTRIES_LIMIT = 5;

// Separado en una función pura para poder probar el corte sin renderizar el
// árbol completo (el repo no tiene testing-library/jsdom configurado, así
// que la lógica de presentación se prueba acá y no contra el JSX).
export function splitVisibleEntries(
  entries: CareerTimelineEntry[],
  limit: number = VISIBLE_ENTRIES_LIMIT,
): { visible: CareerTimelineEntry[]; collapsed: CareerTimelineEntry[] } {
  return {
    visible: entries.slice(0, limit),
    collapsed: entries.slice(limit),
  };
}

// Requisito 3: el club linkea a /equipos/<team_id> solo cuando la entrada
// tiene un equipo real vinculado. Con `team_id` null, `club_name` queda como
// texto plano — es el nombre libre que cargó el jugador, no necesariamente
// un club dado de alta en FutTracker.
export function getClubHref(entry: CareerTimelineEntry): string | null {
  return entry.team_id ? RouteConstants.team.view(entry.team_id) : null;
}

// La abreviatura de posición vive en `lib/format/playerLabels.ts`, al lado
// del nombre completo. Se re-exporta desde acá porque el timeline ya la
// importaba de este módulo.
export { getPositionAbbreviation } from "@/lib/format/playerLabels";
