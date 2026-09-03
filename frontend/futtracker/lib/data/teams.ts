import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Tables } from "@/lib/supabase/database.types";


type Client = SupabaseClient<Database>;

export type Team = Tables<"teams">;

const TEAM_CRESTS_BUCKET = "team-crests";
const CREST_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

// Los campos van con el nombre de la columna y no en camelCase: el schema es
// la fila, así que se escribe con un spread y no hay tabla de traducción que
// se pueda desincronizar.
//
// Los rangos repiten los `check` de la migración a propósito: acá dan un error
// de campo que el formulario puede mostrar, en vez del 400 de PostgREST. Si
// cambia uno, cambia el otro.
//
// Sin `owner_id`, `id` ni `crest_path`: los tres salen de la sesión, de la
// base o de `updateCrestPath`, nunca de un formulario.
export const teamInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  club_name: z.string().trim().min(1).max(120).nullable(),
  category: z.string().trim().min(1).max(120).nullable(),
  league: z.string().trim().min(1).max(120).nullable(),
  city: z.string().trim().min(1).max(120).nullable(),
  province: z.string().trim().min(1).max(120).nullable(),
  country: z.string().trim().length(2).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  founded_year: z.number().int().min(1850).max(2100).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  contact_email: z.email().nullable(),
});

export type TeamInput = z.infer<typeof teamInputSchema>;

export async function getTeamById(
  client: Client,
  id: string,
): Promise<Team | null> {
  const { data, error } = await client
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMyTeam(client: Client): Promise<Team | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await client
    .from("teams")
    .select("*")
    .eq("owner_id", user.id)
    // Un delegado sin equipo devuelve null y no un error: el equipo se crea
    // después del alta de la cuenta.
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * El `owner_id` sale de la sesión y nunca del input: un owner que viene del
 * cliente es un owner que el cliente eligió.
 */
export async function createTeam(
  client: Client,
  input: TeamInput,
): Promise<Team> {
  // El tipo se borra en compilación y a este módulo lo llaman Server Actions,
  // que son endpoints públicos.
  const values = teamInputSchema.parse(input);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("No hay sesión iniciada");
  }

  const { data, error } = await client
    .from("teams")
    .insert({ owner_id: user.id, ...values })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTeam(
  client: Client,
  id: string,
  input: TeamInput,
): Promise<Team> {
  const values = teamInputSchema.parse(input);

  const { data, error } = await client
    .from("teams")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCrestPath(
  client: Client,
  teamId: string,
  path: string,
): Promise<Team> {
  // Repite la regex de la política de `teams`: acá da un error legible, y sin
  // el `[^/]+` un path como `id/../otro.png` apuntaría al escudo de otro.
  if (!new RegExp(`^${teamId}/[^/]+$`).test(path)) {
    throw new Error("El escudo no pertenece a este equipo");
  }

  const { data, error } = await client
    .from("teams")
    .update({ crest_path: path })
    .eq("id", teamId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCrestSignedUrl(
  client: Client,
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from(TEAM_CRESTS_BUCKET)
    .createSignedUrl(path, CREST_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
