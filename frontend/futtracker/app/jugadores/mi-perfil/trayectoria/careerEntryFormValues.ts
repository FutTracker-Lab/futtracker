import { z } from "zod";

import type { CareerEntry } from "@/lib/data/careerEntries";

/**
 * Lo que el formulario de entrada de trayectoria sabe sobre sus valores, sin
 * JSX ni estado — mismo criterio que `teamFormValues.ts`: puro y testeable
 * sin renderizar nada.
 */

export type CareerEntryFormValues = {
  clubName: string;
  teamId: string | null;
  teamLabel: string;
  category: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type CareerEntryFormErrors = Partial<Record<string, string>>;

const FIELD_ERROR_MESSAGES: Record<string, string> = {
  club_name: "El club tiene que tener entre 2 y 120 caracteres.",
  category: "Ingresá una categoría válida.",
  position: "Elegí una posición válida.",
  start_date: "Ingresá una fecha de inicio válida.",
  end_date: "Ingresá una fecha de fin válida.",
};

export function initialValuesFrom(
  entry: CareerEntry | null,
): CareerEntryFormValues {
  return {
    clubName: entry?.club_name ?? "",
    teamId: entry?.team_id ?? null,
    // Sin el nombre del equipo a mano (`career_entries` no lo trae): se
    // precarga con el nombre del club libre, que es lo mejor que hay sin
    // sumar un join solo para esto.
    teamLabel: entry?.team_id ? (entry?.club_name ?? "") : "",
    category: entry?.category ?? "",
    position: entry?.position ?? "",
    startDate: entry?.start_date ?? "",
    // El toggle "Sigo jugando acá" ya deja `end_date` en null en la fila
    // actual, así que no hace falta ocultarla acá también.
    endDate: entry?.end_date ?? "",
    isCurrent: entry?.is_current ?? false,
  };
}

/**
 * Arma el objeto que espera `careerEntryInputSchema`. El toggle "Sigo
 * jugando acá" gana siempre: con `isCurrent` prendido, `end_date` viaja en
 * null pase lo que pase en el campo (requisito 2 y criterio de aceptación).
 */
export function toCareerEntryInput(values: CareerEntryFormValues) {
  return {
    club_name: values.clubName.trim(),
    team_id: values.teamId,
    category: values.category.trim() || null,
    position: values.position || null,
    start_date: values.startDate,
    end_date: values.isCurrent ? null : values.endDate || null,
    is_current: values.isCurrent,
  };
}

export function fieldErrorsFrom(error: z.ZodError): CareerEntryFormErrors {
  const errors: CareerEntryFormErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) {
      errors[field] = FIELD_ERROR_MESSAGES[field] ?? issue.message;
    }
  }

  return errors;
}
