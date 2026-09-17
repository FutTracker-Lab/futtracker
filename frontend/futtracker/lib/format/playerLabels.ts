import { POSITIONS, PREFERRED_FEET } from "@/lib/data/players";

// Los slugs de lib/data/players.ts ya están en español ("arquero",
// "delantero"...); esto solo los deja prolijos para mostrar en UI, no
// traduce nada. Sin next-intl (descartado a nivel proyecto).
export const POSITION_LABELS: Record<(typeof POSITIONS)[number], string> = {
  arquero: "Arquero",
  defensor: "Defensor",
  mediocampista: "Mediocampista",
  delantero: "Delantero",
};

export const PREFERRED_FOOT_LABELS: Record<
  (typeof PREFERRED_FEET)[number],
  string
> = {
  derecha: "Derecha",
  izquierda: "Izquierda",
  ambidiestro: "Ambidiestro",
};

// `player.position`/`player.preferred_foot` son `text` con `check` en la
// base (no un enum), así que el tipo generado es `string | null` — más ancho
// que las claves de estos mapas. Bug de review en PR #9: castear con `as
// keyof typeof` sin chequear pertenencia hace que un valor no contemplado
// (dato viejo, check constraint relajada a mano) renderice `undefined` en
// vez de caer al fallback "—". Estas funciones son el único punto donde se
// lee cualquiera de los dos mapas, así que el chequeo vive acá una sola vez.
export function getPositionLabel(position: string | null): string | null {
  if (!position || !(position in POSITION_LABELS)) return null;
  return POSITION_LABELS[position as keyof typeof POSITION_LABELS];
}

export function getPreferredFootLabel(foot: string | null): string | null {
  if (!foot || !(foot in PREFERRED_FOOT_LABELS)) return null;
  return PREFERRED_FOOT_LABELS[foot as keyof typeof PREFERRED_FOOT_LABELS];
}

// Abreviaturas para el badge de posición del encabezado del perfil: el
// diseño la muestra como una pastilla corta al lado del nombre, no como
// palabra completa. El resto de la app sigue usando `getPositionLabel`.
const POSITION_ABBREVIATIONS: Record<string, string> = {
  arquero: "ARQ",
  defensor: "DEF",
  mediocampista: "MC",
  delantero: "DEL",
};

export function getPositionAbbreviation(position: string | null): string | null {
  if (!position) return null;
  return POSITION_ABBREVIATIONS[position] ?? null;
}
