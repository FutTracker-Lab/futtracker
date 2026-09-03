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
