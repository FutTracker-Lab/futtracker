import { formatInteger, pluralize } from "@/lib/format/numbers";
import { POSITION_LABELS } from "@/lib/format/playerLabels";
import {
  SEARCH_PAGE_SIZE,
  searchHref,
  type SearchCriteria,
} from "@/lib/search/params";

export function resultsSubtitle(
  total: number,
  radius: number,
  city: string | null,
): string {
  const players = pluralize(total, "jugador disponible", "jugadores disponibles");
  return `${formatInteger(total)} ${players} a menos de ${radius} km de ${city ?? "tu equipo"}.`;
}

export type FilterChip = { label: string; removeHref: string };

// "Agente libre" se muestra también con el estado por defecto; quitarlo pasa a `estado=todos`.
export function activeFilterChips(filters: SearchCriteria): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.position) {
    chips.push({
      label: POSITION_LABELS[filters.position],
      removeHref: searchHref({ ...filters, position: null }),
    });
  }
  if (filters.status === "buscan") {
    chips.push({
      label: "Agente libre",
      removeHref: searchHref({ ...filters, status: "todos" }),
    });
  }

  return chips;
}

export function pageCount(total: number): number {
  return Math.ceil(total / SEARCH_PAGE_SIZE);
}
