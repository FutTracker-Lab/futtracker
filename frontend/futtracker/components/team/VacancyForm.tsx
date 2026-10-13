"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createVacancyAction } from "@/app/equipos/vacancies-actions";
import {
  EMPTY_VACANCY_FORM,
  parseVacancyForm,
  type VacancyFormErrors,
  type VacancyFormValues,
} from "@/components/team/vacancyFormValues";
import SelectField from "@/components/ui/SelectField";
import {
  DESCRIPTION_MAX_LENGTH,
  LEVELS,
  MODALITIES,
} from "@/lib/data/vacancies";
import { POSITIONS } from "@/lib/data/players";
import { POSITION_LABELS } from "@/lib/format/playerLabels";
import {
  LEVEL_LABELS,
  MODALITY_LABELS,
  VACANCY_ERROR_MESSAGES,
} from "@/lib/format/vacancyLabels";

const POSITION_OPTIONS = POSITIONS.map((value) => ({
  value,
  label: POSITION_LABELS[value],
}));
const MODALITY_OPTIONS = MODALITIES.map((value) => ({
  value,
  label: MODALITY_LABELS[value],
}));
const LEVEL_OPTIONS = LEVELS.map((value) => ({
  value,
  label: LEVEL_LABELS[value],
}));

type Props = {
  onCancel: () => void;
  onPublished: () => void;
};

// Inline y no modal (discrepancia 8): quien lo monta devuelve el foco al cerrar.
export default function VacancyForm({ onCancel, onPublished }: Props) {
  const [values, setValues] = useState<VacancyFormValues>(EMPTY_VACANCY_FORM);
  const [fieldErrors, setFieldErrors] = useState<VacancyFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function setField(field: keyof VacancyFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseVacancyForm(values);

    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return;
    }

    setFieldErrors({});
    setError(null);

    startTransition(async () => {
      try {
        const result = await createVacancyAction(parsed.input);

        if (result.ok) {
          onPublished();
        } else {
          setError(result.error);
        }
      } catch {
        // Falla de red: la Server Action ni llegó a responder.
        setError(VACANCY_ERROR_MESSAGES.unexpected);
      }
    });
  }

  const descriptionLength = values.description.length;
  const descriptionTooLong = descriptionLength > DESCRIPTION_MAX_LENGTH;

  return (
    <section
      aria-labelledby="vacancy-form-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isPending) {
          event.preventDefault();
          onCancel();
        }
      }}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 id="vacancy-form-title" className="text-base font-semibold text-zinc-900">
          Publicar vacante
        </h3>
        <button
          type="button"
          aria-label="Cerrar formulario"
          onClick={onCancel}
          className="rounded-md px-2 text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ×
        </button>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <SelectField
          ref={firstFieldRef}
          id="vacancy-position"
          name="position"
          label="Posición buscada"
          placeholder="Elegí…"
          options={POSITION_OPTIONS}
          value={values.position}
          onChange={(event) => setField("position", event.target.value)}
          error={fieldErrors.position}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="vacancy-modality"
            name="modality"
            label="Modalidad"
            placeholder="Elegí…"
            options={MODALITY_OPTIONS}
            value={values.modality}
            onChange={(event) => setField("modality", event.target.value)}
            error={fieldErrors.modality}
            required
          />
          <SelectField
            id="vacancy-level"
            name="level"
            label="Nivel"
            placeholder="Elegí…"
            options={LEVEL_OPTIONS}
            value={values.level}
            onChange={(event) => setField("level", event.target.value)}
            error={fieldErrors.level}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="vacancy-description" className="text-sm font-medium text-zinc-900">
              Qué buscan
            </label>
            <span className="text-xs text-zinc-500">opcional</span>
          </div>
          {/* Sin `maxLength`: el ticket pide no cortar el texto y marcar el exceso. */}
          <textarea
            id="vacancy-description"
            name="description"
            rows={3}
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby="vacancy-description-count vacancy-description-help"
            className={`rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 ${
              fieldErrors.description
                ? "border-red-500 focus-visible:ring-red-500"
                : "border-zinc-300 focus-visible:ring-brand"
            }`}
          />
          <span
            id="vacancy-description-count"
            className={`self-end text-xs ${descriptionTooLong ? "font-medium text-red-700" : "text-zinc-500"}`}
          >
            {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
          </span>
          {fieldErrors.description ? (
            <span id="vacancy-description-help" role="alert" className="text-xs text-red-700">
              {fieldErrors.description}
            </span>
          ) : (
            <span id="vacancy-description-help" className="text-xs text-zinc-500">
              Cuanto más claro, menos postulaciones que no encajan.
            </span>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Publicar
          </button>
        </div>
      </form>
    </section>
  );
}
