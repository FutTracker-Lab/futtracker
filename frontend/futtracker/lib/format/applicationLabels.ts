import { formatCount } from "@/lib/format/numbers";

// Sin i18n (next-intl descartado): los textos de `applications.*` viven acá.
export const APPLY_ERROR_MESSAGES = {
  alreadyApplied: "Ya te postulaste a esta vacante.",
  vacancyClosed: "Esta vacante ya está cerrada.",
  profileIncomplete: "Completá tu perfil para postularte.",
  unexpected: "No pudimos enviar tu postulación. Probá de nuevo.",
} as const;

export type ApplyErrorKey = keyof typeof APPLY_ERROR_MESSAGES;

export const WITHDRAW_ERROR_MESSAGE = "No pudimos retirar tu postulación. Probá de nuevo.";

export function openVacanciesSubtitle(total: number): string {
  return `${formatCount(total, "vacante abierta", "vacantes abiertas")}.`;
}

export function applySuccessMessage(positionLabel: string, teamName: string): string {
  return `Te postulaste a la vacante de ${positionLabel} en ${teamName}.`;
}

export function applyButtonLabel(positionLabel: string, teamName: string): string {
  return `Postularme a la vacante de ${positionLabel} en ${teamName}`;
}
