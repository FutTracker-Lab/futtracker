import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Tables } from "@/lib/supabase/database.types";


type Client = SupabaseClient<Database>;

export type Player = Tables<"players">;

const AVATARS_BUCKET = "avatars";
const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export const POSITIONS = [
  "arquero",
  "defensor",
  "mediocampista",
  "delantero",
] as const;

export const PREFERRED_FEET = ["derecha", "izquierda", "ambidiestro"] as const;

export const positionSchema = z.enum(POSITIONS);
export const preferredFootSchema = z.enum(PREFERRED_FEET);

// Los campos van con el nombre de la columna y no en camelCase: el schema es
// la fila, así que se escribe con un spread y no hay tabla de traducción que
// se pueda desincronizar.
//
// Los rangos repiten los `check` de la migración a propósito: acá dan un error
// de campo que el formulario puede mostrar, en vez del 400 de PostgREST. Si
// cambia uno, cambia el otro.
export const playerInputSchema = z.object({
  birth_date: z.iso.date().nullable(),
  position: positionSchema.nullable(),
  preferred_foot: preferredFootSchema.nullable(),
  height_cm: z.number().int().min(100).max(250).nullable(),
  weight_kg: z.number().int().min(30).max(200).nullable(),
  city: z.string().trim().min(1).max(120).nullable(),
  province: z.string().trim().min(1).max(120).nullable(),
  country: z.string().trim().length(2).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  bio: z.string().trim().max(1000).nullable(),
  phone: z.string().trim().min(6).max(30).nullable(),
  is_seeking_team: z.boolean(),
});

export type PlayerInput = z.infer<typeof playerInputSchema>;

export async function getPlayerById(
  client: Client,
  id: string,
): Promise<Player | null> {
  const { data, error } = await client
    .from("players")
    .select("*")
    .eq("id", id)
    // Un jugador sin ficha devuelve null y no un error: la fila nace en el
    // primer guardado del perfil.
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMyPlayer(client: Client): Promise<Player | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  return getPlayerById(client, user.id);
}

export async function getAvatarSignedUrl(
  client: Client,
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

/**
 * Crea la ficha o la actualiza. El `id` sale de la sesión y nunca del input:
 * un id que viene del cliente es un id que el cliente eligió.
 */
export async function upsertPlayer(
  client: Client,
  input: PlayerInput,
): Promise<Player> {
  // El tipo se borra en compilación y a este módulo lo llaman Server Actions,
  // que son endpoints públicos.
  const values = playerInputSchema.parse(input);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("No hay sesión iniciada");
  }

  const { data, error } = await client
    .from("players")
    .upsert({ id: user.id, ...values })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
