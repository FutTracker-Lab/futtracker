import {
  DESCRIPTION_MAX_LENGTH,
  vacancyInputSchema,
  type VacancyInput,
} from "@/lib/data/vacancies";

export type VacancyFormValues = {
  position: string;
  modality: string;
  level: string;
  description: string;
};

export type VacancyFormErrors = Partial<Record<keyof VacancyFormValues, string>>;

export const EMPTY_VACANCY_FORM: VacancyFormValues = {
  position: "",
  modality: "",
  level: "",
  description: "",
};

const FIELD_ERROR_MESSAGES: Record<keyof VacancyFormValues, string> = {
  position: "Elegí una posición.",
  modality: "Elegí una modalidad.",
  level: "Elegí un nivel.",
  description: `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
};

export function parseVacancyForm(
  values: VacancyFormValues,
): { ok: true; input: VacancyInput } | { ok: false; errors: VacancyFormErrors } {
  const parsed = vacancyInputSchema.safeParse({
    position: values.position,
    modality: values.modality,
    level: values.level,
    description: values.description.trim() || null,
  });

  if (parsed.success) {
    return { ok: true, input: parsed.data };
  }

  const errors: VacancyFormErrors = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof VacancyFormValues;
    errors[field] = FIELD_ERROR_MESSAGES[field];
  }

  return { ok: false, errors };
}
