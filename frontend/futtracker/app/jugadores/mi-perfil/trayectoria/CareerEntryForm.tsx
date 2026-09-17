"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCareerEntryAction,
  updateCareerEntryAction,
} from "@/app/jugadores/mi-perfil/trayectoria/actions";
import {
  categoryOptionsFor,
  fieldErrorsFrom,
  initialValuesFrom,
  toCareerEntryInput,
  type CareerEntryFormErrors,
  type CareerEntryFormValues,
} from "@/app/jugadores/mi-perfil/trayectoria/careerEntryFormValues";
import TeamSelector from "@/app/jugadores/mi-perfil/trayectoria/TeamSelector";
import Card from "@/components/ui/Card";
import ComboSelect from "@/components/ui/ComboSelect";
import SelectField from "@/components/ui/SelectField";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";
import { POSITIONS } from "@/lib/data/players";
import { careerEntryInputSchema, type CareerEntry } from "@/lib/data/careerEntries";
import { POSITION_LABELS } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

type FormState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: CareerEntryFormErrors };

const INITIAL_STATE: FormState = { ok: true };

const FIELDS_WITH_CONTROL = new Set([
  "club_name",
  "category",
  "position",
  "start_date",
  "end_date",
]);

const POSITION_OPTIONS = POSITIONS.map((position) => ({
  value: position,
  label: POSITION_LABELS[position],
}));

type Props = {
  entry: CareerEntry | null;
};

export default function CareerEntryForm({ entry }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<CareerEntryFormValues>(() =>
    initialValuesFrom(entry),
  );

  function setField<K extends keyof CareerEntryFormValues>(
    field: K,
    value: CareerEntryFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(
    _prev: FormState,
    _formData: FormData,
  ): Promise<FormState> {
    const parsed = careerEntryInputSchema.safeParse(toCareerEntryInput(values));

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const result = entry
      ? await updateCareerEntryAction(entry.id, parsed.data)
      : await createCareerEntryAction(parsed.data);

    if (result.ok) {
      // Query param y no `Toast` local: este componente se desmonta al
      // navegar, así que el aviso lo tiene que mostrar la página de destino
      // (requisito 9, "toast de éxito").
      router.push(`${RouteConstants.profile.career}?guardado=entrada`);
      return { ok: true };
    }

    return result.field
      ? { ok: false, fieldErrors: { [result.field]: result.error } }
      : { ok: false, error: result.error };
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};

  const bannerErrors = [
    ...(!state.ok && state.error ? [state.error] : []),
    ...Object.entries(fieldErrors)
      .filter(([field]) => !FIELDS_WITH_CONTROL.has(field))
      .map(([field, message]) => `${field}: ${message}`),
  ];

  return (
    <form action={action} className="flex flex-col gap-6">
      {bannerErrors.length > 0 ? (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {bannerErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <Card title="Club">
        <div className="flex flex-col gap-4">
          <TextField
            id="club_name"
            name="club_name"
            type="text"
            label="Nombre del club"
            value={values.clubName}
            onChange={(event) => setField("clubName", event.target.value)}
            error={fieldErrors.club_name}
            required
          />

          <TeamSelector
            value={values.teamId}
            label="Vincular a un equipo de FutTracker"
            onSelect={(team) => {
              setField("teamId", team?.id ?? null);
              if (team) {
                setField("clubName", team.name);
              }
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ComboSelect
              id="category"
              name="category"
              label="Categoría"
              groups={categoryOptionsFor(values.category)}
              placeholder="Sin especificar"
              value={values.category}
              onValueChange={(next) => setField("category", next)}
              error={fieldErrors.category}
            />
            <SelectField
              id="position"
              name="position"
              label="Posición en esta etapa"
              options={POSITION_OPTIONS}
              placeholder="Sin especificar"
              value={values.position}
              onChange={(event) => setField("position", event.target.value)}
              error={fieldErrors.position}
            />
          </div>
        </div>
      </Card>

      <Card title="Período">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="start_date"
              name="start_date"
              type="date"
              label="Fecha de inicio"
              value={values.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
              error={fieldErrors.start_date}
              required
            />
            <TextField
              id="end_date"
              name="end_date"
              type="date"
              label="Fecha de fin"
              value={values.endDate}
              onChange={(event) => setField("endDate", event.target.value)}
              error={fieldErrors.end_date}
              disabled={values.isCurrent}
              optionalHint
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={values.isCurrent}
              onChange={(event) => {
                const isCurrent = event.target.checked;
                setValues((previous) => ({
                  ...previous,
                  isCurrent,
                  // El toggle limpia y deshabilita la fecha de fin (requisito
                  // 2 y criterio de aceptación): no alcanza con mandarlo null
                  // al guardar, el campo tiene que verse vacío ya.
                  endDate: isCurrent ? "" : previous.endDate,
                }));
              }}
              className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand"
            />
            Sigo jugando acá
          </label>
        </div>
      </Card>

      <SubmitButton label={entry ? "Guardar cambios" : "Crear entrada"} />
    </form>
  );
}
