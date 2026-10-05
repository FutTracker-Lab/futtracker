import { z } from "zod";

import type { MatchStat } from "@/lib/data/stats";

/**
 * Lo que el formulario de partido sabe sobre sus valores, sin JSX ni estado.
 * Mismo criterio que `careerEntryFormValues.ts` y `teamFormValues.ts`.
 */

export type MatchStatFormValues = {
  matchDate: string;
  opponent: string;
  competition: string;
  started: boolean;
  minutesPlayed: string;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  cleanSheet: boolean;
};

export type MatchStatFormErrors = Partial<Record<string, string>>;

const FIELD_ERROR_MESSAGES: Record<string, string> = {
  match_date: "Ingresá una fecha válida.",
  opponent: "El rival tiene que tener entre 2 y 80 caracteres.",
  competition: "La competencia tiene que tener entre 2 y 80 caracteres.",
  minutes_played: "Los minutos jugados tienen que estar entre 0 y 130.",
  goals: "Los goles tienen que estar entre 0 y 20.",
  assists: "Las asistencias tienen que estar entre 0 y 20.",
  yellow_cards: "Las amarillas tienen que estar entre 0 y 2.",
  red_cards: "Las rojas tienen que estar entre 0 y 1.",
};

// Requisito 4 de FUT-92: el campo de valla invicta solo existe para una
// entrada de arquero. En cualquier otra posición ni se muestra ni se envía.
export function isCleanSheetVisible(entryPosition: string | null): boolean {
  return entryPosition === "arquero";
}

export function initialValuesFrom(match: MatchStat | null): MatchStatFormValues {
  return {
    matchDate: match?.match_date ?? "",
    opponent: match?.opponent ?? "",
    competition: match?.competition ?? "",
    started: match?.started ?? true,
    minutesPlayed: match?.minutes_played?.toString() ?? "90",
    goals: match?.goals?.toString() ?? "0",
    assists: match?.assists?.toString() ?? "0",
    yellowCards: match?.yellow_cards?.toString() ?? "0",
    redCards: match?.red_cards?.toString() ?? "0",
    cleanSheet: match?.clean_sheet ?? false,
  };
}

/**
 * Arma el objeto que espera `matchStatInputSchema` (T06a). `entryPosition` es
 * lo que decide si `clean_sheet` viaja: en un jugador de campo se manda
 * siempre `false`, nunca lo que haya quedado tildado antes de cambiar de
 * entrada (acá no puede pasar porque el formulario es por entrada, pero deja
 * el contrato explícito).
 */
export function toMatchStatInput(
  values: MatchStatFormValues,
  careerEntryId: string,
  entryPosition: string | null,
) {
  return {
    career_entry_id: careerEntryId,
    match_date: values.matchDate,
    opponent: values.opponent.trim(),
    competition: values.competition.trim() || null,
    started: values.started,
    minutes_played: Number(values.minutesPlayed),
    goals: Number(values.goals),
    assists: Number(values.assists),
    yellow_cards: Number(values.yellowCards),
    red_cards: Number(values.redCards),
    clean_sheet: isCleanSheetVisible(entryPosition) ? values.cleanSheet : false,
  };
}

export function fieldErrorsFrom(error: z.ZodError): MatchStatFormErrors {
  const errors: MatchStatFormErrors = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) {
      errors[field] = FIELD_ERROR_MESSAGES[field] ?? issue.message;
    }
  }

  return errors;
}
