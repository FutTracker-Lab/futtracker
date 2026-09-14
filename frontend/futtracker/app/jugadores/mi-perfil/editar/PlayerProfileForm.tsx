"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import PersonalDataSection from "./PersonalDataSection";
import PlayStyleSection from "./PlayStyleSection";
import { updatePlayerProfile } from "./actions";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  toPlayerInput,
  type PlayerFormErrors,
  type PlayerFormValues,
} from "./playerFormValues";
import SubmitButton from "@/components/ui/SubmitButton";
import { playerInputSchema, type Player } from "@/lib/data/players";

type FormState =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: PlayerFormErrors };

const INITIAL_STATE: FormState = { ok: true };

// Los campos que tienen un control en pantalla y por lo tanto pueden mostrar
// su propio error. Un error de cualquier otra clave (`latitude`/`longitude`,
// que el formulario no edita, o una columna nueva del schema que todavía no
// tenga control) no tiene dónde renderizarse: sin esta lista terminaría
// descartado en silencio y el submit no haría nada sin decir por qué.
const FIELDS_WITH_CONTROL = new Set([
  "full_name",
  "birth_date",
  "phone",
  "city",
  "province",
  "country",
  "position",
  "preferred_foot",
  "height_cm",
  "weight_kg",
  "bio",
]);

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

  // Un objeto y no un useState por campo: con once campos, pasarle a cada
  // sección un valor y un setter por campo serían más de veinte props. Igual
  // son inputs controlados a propósito, mismo motivo que fix/login (PR #8):
  // React resetea un <form action={...}> no controlado apenas la action
  // termina, incluso en error, y borraba todo lo tipeado.
  const [values, setValues] = useState<PlayerFormValues>(() =>
    initialValuesFrom(initialFullName, initialPlayer),
  );

  function setField<K extends keyof PlayerFormValues>(
    field: K,
    value: PlayerFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(
    _prev: FormState,
    _formData: FormData,
  ): Promise<FormState> {
    setSuccess(false);

    // `full_name` vive en `profiles` y no en `players`, así que queda fuera
    // de `playerInputSchema`: se valida acá.
    if (values.fullName.trim().length < 2) {
      return {
        ok: false,
        fieldErrors: { full_name: "Ingresá tu nombre completo." },
      };
    }

    // Mismo schema que usa la Server Action (playerInputSchema, de
    // lib/data/players.ts) — no una copia con los rangos repetidos a mano.
    const parsed = playerInputSchema.safeParse(
      toPlayerInput(values, initialPlayer),
    );

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const result = await updatePlayerProfile(parsed.data, values.fullName);

    if (result.ok) {
      setSuccess(true);
      router.refresh();
      return { ok: true };
    }

    return { ok: false, error: result.error };
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);
  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};

  // Al banner van el error general y, además, los de campos sin control en
  // pantalla: si no, un dato inválido que el formulario no edita dejaría el
  // submit sin efecto y sin explicación.
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
      {success ? (
        <p
          role="status"
          className="rounded-md border border-brand-tint-border bg-brand-tint px-3 py-2 text-sm text-zinc-900"
        >
          Perfil actualizado.
        </p>
      ) : null}

      <PersonalDataSection
        values={values}
        errors={fieldErrors}
        onChange={setField}
        initialAvatarUrl={initialAvatarUrl}
        initialAvatarPath={initialAvatarPath}
      />

      <PlayStyleSection
        values={values}
        errors={fieldErrors}
        onChange={setField}
      />

      <SubmitButton label="Guardar cambios" />
    </form>
  );
}
