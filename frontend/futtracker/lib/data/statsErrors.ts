/**
 * Traduce los errores que puede tirar Postgres al guardar `career_entries` o
 * `match_stats` a un mensaje que un jugador entiende. Nunca hay que mostrar
 * el texto crudo del driver (nota técnica de FUT-92).
 *
 * Separado en funciones puras y sin nada de Supabase para poder testear el
 * mapeo sin una base corriendo — el mismo criterio que `duplicateFrom` en
 * `app/equipos/actions.ts`, pero como función exportada porque acá hay más de
 * un llamador (entradas y partidos).
 */

export type StatsActionError = { error: string; field?: string };

export const UNEXPECTED_STATS_ERROR: StatsActionError = {
  error: "Ocurrió un error inesperado. Probá de nuevo.",
};

const DUPLICATE_MATCH_ERROR: StatsActionError = {
  error: "Ya cargaste este partido.",
};

// Los tres triggers de `match_stats`/`career_entries` (nota técnica del
// ticket), buscados por un fragmento fijo del mensaje porque las partes con
// "%" son dinámicas (nombres de club, cantidad de partidos, fechas).
const TRIGGER_MESSAGE_RULES: { includes: string; result: StatsActionError }[] = [
  {
    includes: "Solo un arquero puede tener valla invicta",
    result: {
      error: "Solo un arquero puede tener valla invicta.",
      field: "clean_sheet",
    },
  },
  {
    includes: "fuera del período de la etapa",
    result: {
      error: "La fecha está fuera del período de este club.",
      field: "match_date",
    },
  },
  {
    includes: "El nuevo período deja",
    result: {
      error:
        "Ese cambio de fechas deja partidos cargados fuera de rango. Editá o borrá esos partidos antes de achicar el período.",
      field: "end_date",
    },
  },
  {
    includes: "No se puede cambiar la posición",
    result: {
      error:
        "No se puede cambiar la posición: hay partidos con valla invicta cargados en esta etapa. Editá o borrá esos partidos primero.",
      field: "position",
    },
  },
  {
    // No debería llegar a dispararse desde la UI (el `career_entry_id` de un
    // partido siempre sale de la ruta del dueño), pero si un cliente manda un
    // id ajeno a mano, mejor esto que el texto de Postgres.
    includes: "no pertenece al jugador de la etapa de trayectoria",
    result: UNEXPECTED_STATS_ERROR,
  },
];

// Mensajes de campo cuando el `check` de rango llega crudo a la Server Action
// (defensa en profundidad: Zod ya valida estos mismos rangos antes del
// insert/update, así que en uso normal esto no debería activarse).
const CHECK_FIELD_RULES: { includes: string; result: StatsActionError }[] = [
  {
    includes: "minutes_played",
    result: {
      error: "Los minutos jugados tienen que estar entre 0 y 130.",
      field: "minutes_played",
    },
  },
  {
    includes: "match_stats_goals",
    result: { error: "Los goles tienen que estar entre 0 y 20.", field: "goals" },
  },
  {
    includes: "assists",
    result: {
      error: "Las asistencias tienen que estar entre 0 y 20.",
      field: "assists",
    },
  },
  {
    includes: "yellow_cards",
    result: {
      error: "Las amarillas tienen que estar entre 0 y 2.",
      field: "yellow_cards",
    },
  },
  {
    includes: "red_cards",
    result: { error: "Las rojas tienen que estar entre 0 y 1.", field: "red_cards" },
  },
  {
    includes: "opponent",
    result: {
      error: "El rival tiene que tener entre 2 y 80 caracteres.",
      field: "opponent",
    },
  },
  {
    includes: "competition",
    result: {
      error: "La competencia tiene que tener entre 2 y 80 caracteres.",
      field: "competition",
    },
  },
];

function errorFieldsOf(error: unknown): { code?: string; message?: string } {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const { code, message } = error as { code?: string; message?: string };
  return { code, message };
}

/**
 * Mapeo compartido por entradas de trayectoria y partidos: los tres triggers
 * viven en el mismo esquema y pueden dispararse desde cualquiera de las dos
 * tablas (ej. achicar el período de una entrada dispara el trigger "El nuevo
 * período deja...").
 */
export function mapStatsError(error: unknown): StatsActionError {
  const { code, message } = errorFieldsOf(error);

  if (code === "23505") {
    return DUPLICATE_MATCH_ERROR;
  }

  if (code === "23514" && message) {
    for (const rule of TRIGGER_MESSAGE_RULES) {
      if (message.includes(rule.includes)) {
        return rule.result;
      }
    }

    for (const rule of CHECK_FIELD_RULES) {
      if (message.includes(rule.includes)) {
        return rule.result;
      }
    }
  }

  return UNEXPECTED_STATS_ERROR;
}
