"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { createTeamAction, updateTeamAction } from "@/app/equipos/actions";
import CrestUploader from "@/components/team/CrestUploader";
import {
  BIO_MAX_LENGTH,
  COUNTRIES,
  MAX_FOUNDED_YEAR,
  MIN_FOUNDED_YEAR,
  fieldErrorsFrom,
  initialValuesFrom,
  toTeamInput,
  type TeamFormErrors,
  type TeamFormValues,
} from "@/components/team/teamFormValues";
import Card from "@/components/ui/Card";
import SelectField from "@/components/ui/SelectField";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";
import { teamInputSchema, type Team } from "@/lib/data/teams";
import { RouteConstants } from "@/lib/routes";

type FormState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: TeamFormErrors };

const INITIAL_STATE: FormState = { ok: true };

// Mismo criterio que el formulario de jugador: un error de una clave sin
// control en pantalla (`club_name`, `latitude`...) no tendría dónde
// renderizarse y dejaría el submit sin efecto y sin explicación.
const FIELDS_WITH_CONTROL = new Set([
  "name",
  "category",
  "league",
  "city",
  "province",
  "country",
  "founded_year",
  "bio",
  "contact_email",
]);

type Props = {
  // null cuando se está creando: ahí no hay id todavía, así que tampoco hay
  // escudo — el bucket necesita el id del equipo en el path.
  team: Team | null;
  initialCrestUrl: string | null;
};

export default function TeamForm({ team, initialCrestUrl }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<TeamFormValues>(() =>
    initialValuesFrom(team),
  );

  function setField<K extends keyof TeamFormValues>(
    field: K,
    value: TeamFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(
    _prev: FormState,
    _formData: FormData,
  ): Promise<FormState> {
    const parsed = teamInputSchema.safeParse(toTeamInput(values, team));

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const result = team
      ? await updateTeamAction(team.id, parsed.data)
      : await createTeamAction(parsed.data);

    if (result.ok) {
      // Al crear, el ticket pide terminar en el perfil del equipo nuevo. Al
      // editar alcanza con refrescar los datos del servidor.
      if (team) {
        router.refresh();
      } else {
        router.push(RouteConstants.team.view(result.teamId));
      }
      return { ok: true };
    }

    // Un duplicado de nombre+ciudad apunta a un campo concreto; el de dueño
    // repetido no, y va al banner.
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

      <Card title="Identidad">
        <div className="flex flex-col gap-4">
          {team ? (
            <CrestUploader
              teamId={team.id}
              teamName={values.name || team.name}
              initialCrestUrl={initialCrestUrl}
              initialCrestPath={team.crest_path}
            />
          ) : (
            // El path del escudo lleva el id del equipo, que recién existe
            // después del insert (requisito 7): al crear se guarda primero y
            // la imagen se sube desde la pantalla de edición.
            <p className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-xs text-zinc-700">
              Vas a poder cargar el escudo apenas guardes el equipo.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="name"
              name="name"
              type="text"
              label="Nombre del club"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              error={fieldErrors.name}
              required
            />
            <TextField
              id="founded_year"
              name="founded_year"
              type="number"
              min={MIN_FOUNDED_YEAR}
              max={MAX_FOUNDED_YEAR}
              label="Año de fundación"
              value={values.foundedYear}
              onChange={(event) => setField("foundedYear", event.target.value)}
              error={fieldErrors.founded_year}
              optionalHint
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="bio" className="text-sm font-medium text-zinc-900">
              Descripción
            </label>
            <textarea
              id="bio"
              name="bio"
              maxLength={BIO_MAX_LENGTH}
              rows={4}
              value={values.bio}
              onChange={(event) => setField("bio", event.target.value)}
              aria-invalid={fieldErrors.bio ? true : undefined}
              aria-describedby={fieldErrors.bio ? "bio-error" : "bio-hint"}
              className={`rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 ${
                fieldErrors.bio
                  ? "border-red-500 focus-visible:ring-red-500"
                  : "border-zinc-300 focus-visible:ring-brand"
              }`}
            />
            <span className="self-end text-xs text-zinc-500">
              {values.bio.length} / {BIO_MAX_LENGTH}
            </span>
            {fieldErrors.bio ? (
              <span id="bio-error" role="alert" className="text-xs text-red-700">
                {fieldErrors.bio}
              </span>
            ) : (
              <span id="bio-hint" className="text-xs text-zinc-500">
                Contá el nivel real y la exigencia: es lo que evita
                postulaciones que no encajan.
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Dónde juega">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="category"
              name="category"
              type="text"
              label="Categoría"
              hint="Primera, Reserva, Sub-20…"
              value={values.category}
              onChange={(event) => setField("category", event.target.value)}
              error={fieldErrors.category}
              optionalHint
            />
            <TextField
              id="league"
              name="league"
              type="text"
              label="Liga"
              value={values.league}
              onChange={(event) => setField("league", event.target.value)}
              error={fieldErrors.league}
              optionalHint
            />
          </div>

          <TextField
            id="contact_email"
            name="contact_email"
            type="email"
            label="Email de contacto"
            hint="Lo ven los jugadores que quieran sumarse."
            value={values.contactEmail}
            onChange={(event) => setField("contactEmail", event.target.value)}
            error={fieldErrors.contact_email}
            optionalHint
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              id="city"
              name="city"
              type="text"
              label="Ciudad"
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
              error={fieldErrors.city}
            />
            <TextField
              id="province"
              name="province"
              type="text"
              label="Provincia"
              value={values.province}
              onChange={(event) => setField("province", event.target.value)}
              error={fieldErrors.province}
            />
            <SelectField
              id="country"
              name="country"
              label="País"
              options={COUNTRIES}
              value={values.country}
              onChange={(event) => setField("country", event.target.value)}
              error={fieldErrors.country}
            />
          </div>
        </div>
      </Card>

      <SubmitButton label={team ? "Guardar cambios" : "Crear equipo"} />
    </form>
  );
}
