import type { SuggestTeamsFailure } from "@/lib/data/suggestions";
import { formatInteger } from "@/lib/format/numbers";

// Sin i18n (next-intl descartado): los textos de `suggestions.*` viven acá.
export const PROFILE_FAILURE_MESSAGES: Record<Exclude<SuggestTeamsFailure, "playersOnly">, string> = {
  completeProfile: "Completá tu posición para recibir sugerencias.",
  missingLocation: "Completá tu ubicación para recibir sugerencias.",
};

export function suggestionsSubtitle(
  total: number,
  positionLabel: string,
  radius: number,
  city: string | null,
): string {
  const teams = total === 1 ? "equipo busca" : "equipos buscan";
  return `${formatInteger(total)} ${teams} tu posición (${positionLabel}) a menos de ${radius} km de ${city ?? "tu ubicación"}.`;
}

export function radiusOptionLabel(radius: number): string {
  return `Hasta ${radius} km`;
}

export function seekingPositionLabel(positionLabel: string): string {
  return `Busca ${positionLabel}`;
}
