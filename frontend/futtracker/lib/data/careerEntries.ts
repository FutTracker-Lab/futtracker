import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { positionSchema } from "@/lib/data/players";
import type { Database, Tables } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type CareerEntry = Tables<"career_entries">;

// Los campos van con el nombre de la columna, mismo criterio que
// `teamInputSchema`/`playerInputSchema`: el schema es la fila y no hay tabla
// de traducción que se pueda desincronizar.
//
// No hay columna de temporada (requisito 4 de FUT-92): el año siempre sale de
// `start_date`/`end_date` o de `match_date` en los partidos.
export const careerEntryInputSchema = z
  .object({
    club_name: z.string().trim().min(2).max(120),
    team_id: z.uuid().nullable(),
    category: z.string().trim().min(1).max(120).nullable(),
    position: positionSchema.nullable(),
    start_date: z.iso.date(),
    end_date: z.iso.date().nullable(),
    is_current: z.boolean(),
  })
  // Toggle "Sigo jugando acá": si está prendido, `end_date` viaja siempre en
  // null (lo limpia el propio formulario, pero se repite acá porque el input
  // de una Server Action no es de fiar).
  .refine((value) => !value.is_current || value.end_date === null, {
    message: "Si seguís jugando ahí, no puede haber fecha de fin.",
    path: ["end_date"],
  })
  .refine(
    (value) => !value.end_date || value.end_date >= value.start_date,
    {
      message: "La fecha de fin no puede ser anterior a la de inicio.",
      path: ["end_date"],
    },
  );

export type CareerEntryInput = z.infer<typeof careerEntryInputSchema>;

export async function getCareerEntryById(
  client: Client,
  id: string,
): Promise<CareerEntry | null> {
  const { data, error } = await client
    .from("career_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * El `player_id` sale de la sesión y nunca del input: un id que viene del
 * cliente es un id que el cliente eligió (mismo motivo que `createTeam`).
 */
export async function createCareerEntry(
  client: Client,
  input: CareerEntryInput,
): Promise<CareerEntry> {
  const values = careerEntryInputSchema.parse(input);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("No hay sesión iniciada");
  }

  const { data, error } = await client
    .from("career_entries")
    .insert({ player_id: user.id, ...values })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCareerEntry(
  client: Client,
  id: string,
  input: CareerEntryInput,
): Promise<CareerEntry> {
  const values = careerEntryInputSchema.parse(input);

  const { data, error } = await client
    .from("career_entries")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Cascade real (borra `match_stats` de la etapa) lo hace la base — el
// requisito 6 solo pide advertirlo antes de confirmar, acá no hay nada extra
// que hacer.
export async function deleteCareerEntry(client: Client, id: string): Promise<void> {
  const { error } = await client.from("career_entries").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
