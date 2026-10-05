"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createMatchStatAction,
  updateMatchStatAction,
} from "@/app/jugadores/mi-perfil/trayectoria/actions";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  isCleanSheetVisible,
  toMatchStatInput,
  type MatchStatFormErrors,
  type MatchStatFormValues,
} from "@/app/jugadores/mi-perfil/trayectoria/matchStatFormValues";
import Card from "@/components/ui/Card";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";
import { matchStatInputSchema, type MatchStat } from "@/lib/data/stats";
import { RouteConstants } from "@/lib/routes";

type FormState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: MatchStatFormErrors };

const INITIAL_STATE: FormState = { ok: true };

const FIELDS_WITH_CONTROL = new Set([
  "match_date",
  "opponent",
  "competition",
  "minutes_played",
  "goals",
  "assists",
  "yellow_cards",
  "red_cards",
]);

type Props = {
  careerEntryId: string;
  // Posición de la etapa dueña del partido: decide si el campo de valla
  // invicta se muestra (requisito 4). No es un campo del formulario.
  entryPosition: string | null;
  match: MatchStat | null;
};

export default function MatchStatsForm({
  careerEntryId,
  entryPosition,
  match,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<MatchStatFormValues>(() =>
    initialValuesFrom(match),
  );
  const showCleanSheet = isCleanSheetVisible(entryPosition);

  function setField<K extends keyof MatchStatFormValues>(
    field: K,
    value: MatchStatFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(
    _prev: FormState,
    _formData: FormData,
  ): Promise<FormState> {
    const parsed = matchStatInputSchema.safeParse(
      toMatchStatInput(values, careerEntryId, entryPosition),
    );

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const result = match
      ? await updateMatchStatAction(careerEntryId, match.id, parsed.data)
      : await createMatchStatAction(careerEntryId, parsed.data);

    if (result.ok) {
      // Mismo motivo que en `CareerEntryForm`: el aviso de éxito lo muestra
      // la página de destino, vía query param.
      router.push(
        `${RouteConstants.profile.careerMatches(careerEntryId)}?guardado=partido`,
      );
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

      <Card title="Partido">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="match_date"
              name="match_date"
              type="date"
              label="Fecha"
              value={values.matchDate}
              onChange={(event) => setField("matchDate", event.target.value)}
              error={fieldErrors.match_date}
              required
            />
            <TextField
              id="opponent"
              name="opponent"
              type="text"
              label="Rival"
              value={values.opponent}
              onChange={(event) => setField("opponent", event.target.value)}
              error={fieldErrors.opponent}
              required
            />
          </div>

          <TextField
            id="competition"
            name="competition"
            type="text"
            label="Competencia"
            hint="Liga, torneo, amistoso…"
            value={values.competition}
            onChange={(event) => setField("competition", event.target.value)}
            error={fieldErrors.competition}
            optionalHint
          />

          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              checked={values.started}
              onChange={(event) => setField("started", event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand"
            />
            Fui titular
          </label>
        </div>
      </Card>

      <Card title="Rendimiento">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <TextField
              id="minutes_played"
              name="minutes_played"
              type="number"
              min={0}
              max={130}
              label="Minutos jugados"
              value={values.minutesPlayed}
              onChange={(event) => setField("minutesPlayed", event.target.value)}
              error={fieldErrors.minutes_played}
              required
            />
            <TextField
              id="goals"
              name="goals"
              type="number"
              min={0}
              max={20}
              label="Goles"
              value={values.goals}
              onChange={(event) => setField("goals", event.target.value)}
              error={fieldErrors.goals}
              required
            />
            <TextField
              id="assists"
              name="assists"
              type="number"
              min={0}
              max={20}
              label="Asistencias"
              value={values.assists}
              onChange={(event) => setField("assists", event.target.value)}
              error={fieldErrors.assists}
              required
            />
            <TextField
              id="yellow_cards"
              name="yellow_cards"
              type="number"
              min={0}
              max={2}
              label="Amarillas"
              value={values.yellowCards}
              onChange={(event) => setField("yellowCards", event.target.value)}
              error={fieldErrors.yellow_cards}
              required
            />
            <TextField
              id="red_cards"
              name="red_cards"
              type="number"
              min={0}
              max={1}
              label="Rojas"
              value={values.redCards}
              onChange={(event) => setField("redCards", event.target.value)}
              error={fieldErrors.red_cards}
              required
            />
          </div>

          {showCleanSheet ? (
            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={values.cleanSheet}
                onChange={(event) => setField("cleanSheet", event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand"
              />
              Valla invicta
            </label>
          ) : null}
        </div>
      </Card>

      <SubmitButton label={match ? "Guardar cambios" : "Cargar partido"} />
    </form>
  );
}
