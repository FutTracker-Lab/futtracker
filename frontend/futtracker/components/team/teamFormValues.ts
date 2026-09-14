import { z } from "zod";

import type { Team } from "@/lib/data/teams";

/**
 * Lo que el formulario de equipo sabe sobre sus valores, sin JSX ni estado:
 * qué campos hay, cómo se precargan, cómo se arma el input del schema de T05a
 * y cómo se traducen sus errores. Al ser puro se testea sin renderizar nada.
 */

// Todo string porque son valores de <input>/<select>: la conversión a número
// o null pasa una sola vez, en `toTeamInput`.
export type TeamFormValues = {
  name: string;
  category: string;
  league: string;
  city: string;
  province: string;
  country: string;
  foundedYear: string;
  bio: string;
  contactEmail: string;
};

export type TeamFormErrors = Partial<Record<string, string>>;

// Los mensajes de Zod salen en inglés y con el fraseo de la librería. El
// schema es de T05a y no se toca desde acá, así que la traducción vive del
// lado del formulario.
const FIELD_ERROR_MESSAGES: Record<string, string> = {
  name: "El nombre tiene que tener entre 2 y 80 caracteres.",
  category: "Ingresá una categoría válida.",
  league: "Ingresá una liga válida.",
  city: "Ingresá una ciudad válida.",
  province: "Ingresá una provincia válida.",
  country: "Elegí un país.",
  founded_year: "Ingresá un año entre 1850 y el actual.",
  bio: "La descripción no puede superar los 1000 caracteres.",
  contact_email: "Ingresá un email válido.",
};

// Mismo criterio que el formulario de jugador: códigos ISO de dos letras,
// empezando por la región.
export const COUNTRIES = [
  { value: "AR", label: "Argentina" },
  { value: "UY", label: "Uruguay" },
  { value: "CL", label: "Chile" },
  { value: "PY", label: "Paraguay" },
  { value: "BO", label: "Bolivia" },
  { value: "BR", label: "Brasil" },
];

// El `check` de la migración llega hasta 2100 porque Postgres exige que sea
// IMMUTABLE y no admite `now()`. El filtro real es este, como dice el propio
// comentario de la migración.
export const MAX_FOUNDED_YEAR = new Date().getFullYear();
export const MIN_FOUNDED_YEAR = 1850;

export const BIO_MAX_LENGTH = 1000;

export function initialValuesFrom(team: Team | null): TeamFormValues {
  return {
    name: team?.name ?? "",
    category: team?.category ?? "",
    league: team?.league ?? "",
    city: team?.city ?? "",
    province: team?.province ?? "",
    country: team?.country ?? "AR",
    foundedYear: team?.founded_year?.toString() ?? "",
    bio: team?.bio ?? "",
    contactEmail: team?.contact_email ?? "",
  };
}

/**
 * Arma el objeto que espera `teamInputSchema`. El string vacío de un <input>
 * se traduce a null: las columnas son nullable y guardar "" fallaría contra
 * el `min(1)` del schema.
 *
 * `club_name` queda fuera a propósito (discrepancia 4 del ticket: el diseño
 * muestra un solo campo de nombre y `name` es el obligatorio), igual que
 * `latitude`/`longitude`, que se arrastran de la fila porque el formulario no
 * las edita y mandarlas en null las borraría en cada guardado.
 */
export function toTeamInput(values: TeamFormValues, team: Team | null) {
  return {
    name: values.name.trim(),
    club_name: team?.club_name ?? null,
    category: values.category || null,
    league: values.league || null,
    city: values.city || null,
    province: values.province || null,
    country: values.country || null,
    latitude: team?.latitude ?? null,
    longitude: team?.longitude ?? null,
    founded_year: values.foundedYear ? Number(values.foundedYear) : null,
    bio: values.bio || null,
    contact_email: values.contactEmail || null,
  };
}

/**
 * Un mensaje por campo, no solo el primero: con un banner único el usuario
 * corrige de a un error por intento.
 */
export function fieldErrorsFrom(error: z.ZodError): TeamFormErrors {
  const errors: TeamFormErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) {
      errors[field] = FIELD_ERROR_MESSAGES[field] ?? issue.message;
    }
  }

  return errors;
}
