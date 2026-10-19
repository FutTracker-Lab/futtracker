import { z } from "zod";

import type { Player } from "@/lib/data/players";
import type { Zone } from "@/lib/data/zones";
import { isListedZone } from "@/lib/format/zones";

/**
 * Todo lo que el formulario de perfil sabe sobre sus valores, sin JSX ni
 * estado de React: qué campos hay, cómo se precargan desde la fila, cómo se
 * arma el input que espera el schema de T04a y cómo se traducen sus errores.
 *
 * Vive aparte del componente porque es lógica pura — se testea sin renderizar
 * nada y deja a PlayerProfileForm ocupándose solo de orquestar.
 */

// Todo string porque son valores de <input>/<select>: la conversión a
// número, null o boolean pasa una sola vez, en `toPlayerInput`.
export type PlayerFormValues = {
  fullName: string;
  position: string;
  preferredFoot: string;
  heightCm: string;
  weightKg: string;
  birthDate: string;
  zoneId: string;
  country: string;
  phone: string;
  bio: string;
  isSeekingTeam: boolean;
};

export type PlayerFormErrors = Partial<Record<string, string>>;

// Los mensajes de Zod salen en inglés y con el fraseo de la librería ("Too
// small: expected string to have >=6 characters"). El schema es de T04a y no
// se toca desde acá, así que la traducción vive del lado del formulario.
const FIELD_ERROR_MESSAGES: Record<string, string> = {
  birth_date: "Ingresá una fecha válida.",
  position: "Elegí una posición de la lista.",
  preferred_foot: "Elegí una opción de la lista.",
  height_cm: "La altura tiene que estar entre 100 y 250 cm.",
  weight_kg: "El peso tiene que estar entre 30 y 200 kg.",
  zone_id: "Elegí una zona de la lista.",
  country: "Elegí un país.",
  bio: "La bio no puede superar los 1000 caracteres.",
  phone: "El teléfono tiene que tener entre 6 y 30 caracteres.",
};

// `country` es `text` con `length(2)` en el schema: códigos ISO de dos
// letras. La lista arranca por los países de la región, que es donde vive el
// fútbol amateur del MVP; ampliarla es agregar entradas acá.
export const COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "UY", label: "Uruguay" },
  { value: "CL", label: "Chile" },
  { value: "PY", label: "Paraguay" },
  { value: "BO", label: "Bolivia" },
  { value: "BR", label: "Brasil" },
];

export function initialValuesFrom(
  fullName: string,
  player: Player | null,
  zones: Zone[],
): PlayerFormValues {
  const zoneId = player?.zone_id ?? "";

  return {
    fullName,
    position: player?.position ?? "",
    preferredFoot: player?.preferred_foot ?? "",
    heightCm: player?.height_cm?.toString() ?? "",
    weightKg: player?.weight_kg?.toString() ?? "",
    birthDate: player?.birth_date ?? "",
    zoneId: isListedZone(zoneId, zones) ? zoneId : "",
    country: player?.country ?? "AR",
    phone: player?.phone ?? "",
    bio: player?.bio ?? "",
    isSeekingTeam: player?.is_seeking_team ?? true,
  };
}

/**
 * Arma el objeto que espera `playerInputSchema`. El string vacío de un
 * <input> se traduce a null: la columna es nullable y guardar "" haría que
 * un campo vacío falle contra el `min(1)` del schema.
 */
export function toPlayerInput(values: PlayerFormValues) {
  return {
    birth_date: values.birthDate || null,
    position: values.position || null,
    preferred_foot: values.preferredFoot || null,
    height_cm: values.heightCm ? Number(values.heightCm) : null,
    weight_kg: values.weightKg ? Number(values.weightKg) : null,
    zone_id: values.zoneId || null,
    country: values.country || null,
    bio: values.bio || null,
    phone: values.phone || null,
    is_seeking_team: values.isSeekingTeam,
  };
}

/**
 * Un mensaje por campo, no solo el primero: el requisito 7 pide errores por
 * campo, y con un banner único el usuario corrige de a un error por intento.
 * Si un campo acumula varios issues gana el primero, que es el más específico.
 */
export function fieldErrorsFrom(error: z.ZodError): PlayerFormErrors {
  const errors: PlayerFormErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) {
      errors[field] = FIELD_ERROR_MESSAGES[field] ?? issue.message;
    }
  }

  return errors;
}
