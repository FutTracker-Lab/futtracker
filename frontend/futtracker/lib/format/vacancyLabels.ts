import type { LEVELS, MODALITIES, VacancyErrorKey, VacancyStatus } from "@/lib/data/vacancies";

// Sin i18n (next-intl descartado): los textos de `vacancies.*` viven acá.
export const MODALITY_LABELS: Record<(typeof MODALITIES)[number], string> = {
  futbol_11: "Fútbol 11",
  futbol_7: "Fútbol 7",
};

export const LEVEL_LABELS: Record<(typeof LEVELS)[number], string> = {
  recreativo: "Recreativo",
  intermedio: "Intermedio avanzado",
  competitivo: "Competitivo amateur",
};

export const STATUS_LABELS: Record<VacancyStatus, string> = {
  open: "Abierta",
  closed: "Cerrada",
};

export const REOPEN_DUPLICATE_MESSAGE =
  "No podés reabrirla: ya tenés una vacante abierta para esa posición.";

export const VACANCY_ERROR_MESSAGES: Record<VacancyErrorKey, string> = {
  duplicateOpenPosition: "Ya tenés una vacante abierta para esa posición.",
  fieldsLocked: "Una vacante publicada no se puede editar.",
  forbidden: "No tenés permiso para esa acción.",
  unexpected: "Ocurrió un error inesperado. Probá de nuevo.",
};

// Columnas `text` con `check`: mismo resguardo que `getPositionLabel`.
function labelFrom(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

export function getModalityLabel(modality: string): string {
  return labelFrom(MODALITY_LABELS, modality);
}

export function getLevelLabel(level: string): string {
  return labelFrom(LEVEL_LABELS, level);
}

export function getStatusLabel(status: string): string {
  return labelFrom(STATUS_LABELS, status);
}

export function openVacanciesLabel(count: number): string {
  if (count === 0) return "Sin vacantes abiertas";
  return count === 1 ? "1 vacante abierta" : `${count} vacantes abiertas`;
}

export function applicationsCountLabel(count: number): string {
  return count === 1 ? "1 postulación" : `${count} postulaciones`;
}
