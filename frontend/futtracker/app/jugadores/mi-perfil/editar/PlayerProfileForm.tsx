"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updatePlayerProfile, type UpdatePlayerResult } from "./actions";
import { POSITIONS, PREFERRED_FEET, playerInputSchema, type Player } from "@/lib/data/players";
import { POSITION_LABELS, PREFERRED_FOOT_LABELS } from "@/lib/format/playerLabels";
import SubmitButton from "@/components/ui/SubmitButton";
import TextField from "@/components/ui/TextField";

const INITIAL_STATE: UpdatePlayerResult = { ok: true };

const SELECT_CLASS =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

type Props = {
  initialFullName: string;
  // `Player` (la fila real), no `PlayerInput`: la columna `position` en la
  // base es `text` con un `check`, no un enum, así que el tipo generado es
  // `string | null`, más ancho que la unión literal del schema de Zod. Acá
  // solo se lee para precargar el form, nunca se reenvía sin validar.
  initialPlayer: Player | null;
};

export default function PlayerProfileForm({ initialFullName, initialPlayer }: Props) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  // Inputs controlados a propósito, mismo motivo que fix/login (PR #8):
  // React resetea un <form action={...}> no controlado apenas la action
  // termina, incluso en error — sin esto, un error de validación (altura
  // fuera de rango, etc.) borraba todo lo tipeado en vez de dejarlo para
  // corregir. Deuda señalada en review de PR #9, resuelta acá.
  const [fullName, setFullName] = useState(initialFullName);
  const [position, setPosition] = useState(initialPlayer?.position ?? "");
  const [preferredFoot, setPreferredFoot] = useState(initialPlayer?.preferred_foot ?? "");
  const [heightCm, setHeightCm] = useState(initialPlayer?.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(initialPlayer?.weight_kg?.toString() ?? "");
  const [birthDate, setBirthDate] = useState(initialPlayer?.birth_date ?? "");
  const [city, setCity] = useState(initialPlayer?.city ?? "");
  const [province, setProvince] = useState(initialPlayer?.province ?? "");
  const [phone, setPhone] = useState(initialPlayer?.phone ?? "");
  const [bio, setBio] = useState(initialPlayer?.bio ?? "");
  const [isSeekingTeam, setIsSeekingTeam] = useState(initialPlayer?.is_seeking_team ?? true);

  async function handleSubmit(
    _prev: UpdatePlayerResult,
    _formData: FormData,
  ): Promise<UpdatePlayerResult> {
    const input = {
      birth_date: birthDate || null,
      position: position || null,
      preferred_foot: preferredFoot || null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      city: city || null,
      province: province || null,
      // Sin selector de país en este ticket (decisión 1.6/supuesto 5 del
      // doc de decisiones: no hay UI para esto todavía). "AR" fijo evita
      // pisar el default de la migración con null en cada guardado.
      country: "AR",
      // Sin selector de geolocalización en este ticket, mismo motivo que el
      // país.
      latitude: null,
      longitude: null,
      bio: bio || null,
      phone: phone || null,
      is_seeking_team: isSeekingTeam,
    };

    // Mismo schema que usa la Server Action (playerInputSchema, de
    // lib/data/players.ts) — no una copia con los números repetidos a mano.
    const parsed = playerInputSchema.safeParse(input);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        ok: false,
        error: firstIssue?.message ?? "Revisá los datos ingresados.",
      };
    }

    const result = await updatePlayerProfile(parsed.data, fullName);

    if (result.ok) {
      setSuccess(true);
      router.refresh();
    }

    return result;
  }

  const [state, action] = useActionState(handleSubmit, INITIAL_STATE);

  return (
    <form action={action} className="flex flex-col gap-4">
      {!state.ok ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-md bg-brand-tint px-3 py-2 text-sm text-zinc-900">
          Perfil actualizado.
        </p>
      ) : null}

      <TextField
        id="full_name"
        name="full_name"
        type="text"
        label="Nombre completo"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="position" className="text-sm font-medium text-zinc-900">
            Posición
          </label>
          <select
            id="position"
            name="position"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">—</option>
            {POSITIONS.map((positionOption) => (
              <option key={positionOption} value={positionOption}>
                {POSITION_LABELS[positionOption]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="preferred_foot" className="text-sm font-medium text-zinc-900">
            Pierna hábil
          </label>
          <select
            id="preferred_foot"
            name="preferred_foot"
            value={preferredFoot}
            onChange={(event) => setPreferredFoot(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">—</option>
            {PREFERRED_FEET.map((foot) => (
              <option key={foot} value={foot}>
                {PREFERRED_FOOT_LABELS[foot]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="height_cm"
          name="height_cm"
          type="number"
          min={100}
          max={250}
          label="Altura (cm)"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
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
        />
      </div>

      <TextField
        id="birth_date"
        name="birth_date"
        type="date"
        label="Fecha de nacimiento"
        value={birthDate}
        onChange={(event) => setBirthDate(event.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="city"
          name="city"
          type="text"
          label="Ciudad"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
        <TextField
          id="province"
          name="province"
          type="text"
          label="Provincia"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
        />
      </div>

      <TextField
        id="phone"
        name="phone"
        type="tel"
        label="Teléfono"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />

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
          className={SELECT_CLASS}
        />
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

      <SubmitButton label="Guardar cambios" />
    </form>
  );
}
