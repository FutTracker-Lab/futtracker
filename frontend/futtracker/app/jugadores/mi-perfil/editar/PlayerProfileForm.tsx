"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updatePlayerProfile } from "./actions";
import AvatarUploader from "@/components/player/AvatarUploader";
import Card from "@/components/ui/Card";
import SelectField from "@/components/ui/SelectField";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";
import { POSITIONS, PREFERRED_FEET, playerInputSchema, type Player } from "@/lib/data/players";
import { POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/format/playerLabels";

type FormState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

const INITIAL_STATE: FormState = { ok: true };

// Los mensajes de Zod salen en inglés y con el fraseo de la librería ("Too
// small: expected string to have >=6 characters"). El schema es de T04a y no
// se toca desde acá, así que la traducción vive en el formulario, por campo.
const FIELD_ERROR_MESSAGES: Record<string, string> = {
  birth_date: "Ingresá una fecha válida.",
  position: "Elegí una posición de la lista.",
  preferred_foot: "Elegí una opción de la lista.",
  height_cm: "La altura tiene que estar entre 100 y 250 cm.",
  weight_kg: "El peso tiene que estar entre 30 y 200 kg.",
  city: "Ingresá una ciudad válida.",
  province: "Ingresá una provincia válida.",
  country: "Elegí un país.",
  bio: "La bio no puede superar los 1000 caracteres.",
  phone: "El teléfono tiene que tener entre 6 y 30 caracteres.",
};

// `country` es `text` con `length(2)` en el schema: códigos ISO de dos
// letras. La lista arranca por los países de la región, que es donde vive el
// fútbol amateur del MVP; ampliarla es agregar entradas acá.
const COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "UY", label: "Uruguay" },
  { value: "CL", label: "Chile" },
  { value: "PY", label: "Paraguay" },
  { value: "BO", label: "Bolivia" },
  { value: "BR", label: "Brasil" },
];

const POSITION_OPTIONS = POSITIONS.map((position) => ({
  value: position,
  label: POSITION_LABELS[position],
}));

const PREFERRED_FOOT_OPTIONS = PREFERRED_FEET.map((foot) => ({
  value: foot,
  label: PREFERRED_FOOT_LABELS[foot],
}));

type Props = {
  initialFullName: string;
  // `Player` (la fila real), no `PlayerInput`: la columna `position` en la
  // base es `text` con un `check`, no un enum, así que el tipo generado es
  // `string | null`, más ancho que la unión literal del schema de Zod. Acá
  // solo se lee para precargar el form, nunca se reenvía sin validar.
  initialPlayer: Player | null;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
};

export default function PlayerProfileForm({
  initialFullName,
  initialPlayer,
  initialAvatarUrl,
  initialAvatarPath,
}: Props) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  // Inputs controlados a propósito, mismo motivo que fix/login (PR #8):
  // React resetea un <form action={...}> no controlado apenas la action
  // termina, incluso en error — sin esto, un error de validación borraba
  // todo lo tipeado en vez de dejarlo para corregir.
  const [fullName, setFullName] = useState(initialFullName);
  const [position, setPosition] = useState(initialPlayer?.position ?? "");
  const [preferredFoot, setPreferredFoot] = useState(initialPlayer?.preferred_foot ?? "");
  const [heightCm, setHeightCm] = useState(initialPlayer?.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(initialPlayer?.weight_kg?.toString() ?? "");
  const [birthDate, setBirthDate] = useState(initialPlayer?.birth_date ?? "");
  const [city, setCity] = useState(initialPlayer?.city ?? "");
  const [province, setProvince] = useState(initialPlayer?.province ?? "");
  const [country, setCountry] = useState(initialPlayer?.country ?? "AR");
  const [phone, setPhone] = useState(initialPlayer?.phone ?? "");
  const [bio, setBio] = useState(initialPlayer?.bio ?? "");
  const [isSeekingTeam, setIsSeekingTeam] = useState(initialPlayer?.is_seeking_team ?? true);

  async function handleSubmit(
    _prev: FormState,
    _formData: FormData,
  ): Promise<FormState> {
    setSuccess(false);

    if (fullName.trim().length < 2) {
      return { ok: false, fieldErrors: { full_name: "Ingresá tu nombre completo." } };
    }

    const input = {
      birth_date: birthDate || null,
      position: position || null,
      preferred_foot: preferredFoot || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      city: city || null,
      province: province || null,
      country: country || null,
      // Sin selector de geolocalización en este ticket: el supuesto 5 del
      // doc de decisiones posterga la búsqueda por cercanía (y con ella la
      // carga de lat/long) a T09a. Son las dos únicas columnas de `players`
      // que este formulario no edita.
      latitude: initialPlayer?.latitude ?? null,
      longitude: initialPlayer?.longitude ?? null,
      bio: bio || null,
      phone: phone || null,
      is_seeking_team: isSeekingTeam,
    };

    // Mismo schema que usa la Server Action (playerInputSchema, de
    // lib/data/players.ts) — no una copia con los números repetidos a mano.
    const parsed = playerInputSchema.safeParse(input);

    if (!parsed.success) {
      // Un mensaje por campo, no solo el primero: el requisito 7 pide
      // errores por campo, y con un banner único el usuario corrige de a un
      // error por intento.
      const fieldErrors: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = FIELD_ERROR_MESSAGES[field] ?? issue.message;
        }
      }

      return { ok: false, fieldErrors };
    }

    const result = await updatePlayerProfile(parsed.data, fullName);

    if (result.ok) {
      setSuccess(true);
      router.refresh();
      return { ok: true };
    }

    return { ok: false, error: result.error };
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="flex flex-col gap-6">
      {!state.ok && state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-sm text-zinc-900"
        >
          Perfil actualizado.
        </p>
      ) : null}

      <Card title="Datos personales">
        <div className="flex flex-col gap-4">
          <AvatarUploader
            fullName={fullName}
            initialAvatarUrl={initialAvatarUrl}
            initialAvatarPath={initialAvatarPath}
          />

          <TextField
            id="full_name"
            name="full_name"
            type="text"
            label="Nombre y apellido"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={fieldErrors.full_name}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="birth_date"
              name="birth_date"
              type="date"
              label="Fecha de nacimiento"
              hint="No se muestra: se publica solo la edad."
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              error={fieldErrors.birth_date}
              optionalHint
            />
            <TextField
              id="phone"
              name="phone"
              type="tel"
              label="Teléfono"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              error={fieldErrors.phone}
              optionalHint
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              id="city"
              name="city"
              type="text"
              label="Ciudad"
              hint="Desde dónde te movés para entrenar."
              value={city}
              onChange={(event) => setCity(event.target.value)}
              error={fieldErrors.city}
            />
            <TextField
              id="province"
              name="province"
              type="text"
              label="Provincia"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              error={fieldErrors.province}
            />
            <SelectField
              id="country"
              name="country"
              label="País"
              options={COUNTRIES}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              error={fieldErrors.country}
            />
          </div>
        </div>
      </Card>

      <Card title="Cómo jugás">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="position"
              name="position"
              label="Posición"
              options={POSITION_OPTIONS}
              placeholder="—"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              error={fieldErrors.position}
            />
            <SelectField
              id="preferred_foot"
              name="preferred_foot"
              label="Pierna hábil"
              options={PREFERRED_FOOT_OPTIONS}
              placeholder="—"
              value={preferredFoot}
              onChange={(event) => setPreferredFoot(event.target.value)}
              error={fieldErrors.preferred_foot}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="height_cm"
              name="height_cm"
              type="number"
              min={100}
              max={250}
              label="Altura (cm)"
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
              error={fieldErrors.height_cm}
              optionalHint
            />
            <TextField
              id="weight_kg"
              name="weight_kg"
              type="number"
              min={30}
              max={200}
              label="Peso (kg)"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              error={fieldErrors.weight_kg}
              optionalHint
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="bio" className="text-sm font-medium text-zinc-900">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              maxLength={1000}
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              aria-invalid={fieldErrors.bio ? true : undefined}
              className={`rounded-md border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 ${
                fieldErrors.bio
                  ? "border-red-500 focus-visible:ring-red-500"
                  : "border-zinc-300 focus-visible:ring-brand"
              }`}
            />
            {fieldErrors.bio ? (
              <span role="alert" className="text-xs text-red-700">
                {fieldErrors.bio}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                Contá tu nivel real y tu disponibilidad: es lo que evita
                postulaciones que no encajan.
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-900">
            <input
              type="checkbox"
              name="is_seeking_team"
              checked={isSeekingTeam}
              onChange={(event) => setIsSeekingTeam(event.target.checked)}
            />
            Busco equipo
          </label>
        </div>
      </Card>

      <SubmitButton label="Guardar cambios" />
    </form>
  );
}
