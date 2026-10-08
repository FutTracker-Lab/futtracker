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

// ---------------------------------------------------------------------------
// Búsqueda de jugadores (T09a): cliente tipado de la función `search_players`.
// ---------------------------------------------------------------------------

export type Position = z.infer<typeof positionSchema>;

// Los topes repiten las validaciones de la función a propósito, igual que los
// `check` de arriba: acá frenan un parámetro inválido antes del viaje a la
// base. Si cambia uno, cambia el otro.
export const SEARCH_MAX_RADIUS_KM = 200;
export const SEARCH_MAX_LIMIT = 50;

// Los parámetros van en camelCase porque es el contrato que usa T09b
// (`searchPlayers({ radius, position, seekingOnly, limit, offset })`); el
// helper los traduce a los `p_*` de la función.
export const searchPlayersParamsSchema = z.object({
  radius: z.number().int().min(1).max(SEARCH_MAX_RADIUS_KM),
  position: positionSchema.nullable().default(null),
  seekingOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchPlayersParams = z.input<typeof searchPlayersParamsSchema>;

// Tipo propio y no el generado: el generador de Supabase marca como no
// nulas todas las columnas que devuelve una función, y `avatar_path`,
// `position`, `age`, `city` y `province` pueden venir en null.
export type PlayerSearchRow = {
  player_id: string;
  full_name: string;
  avatar_path: string | null;
  position: Position | null;
  age: number | null;
  city: string | null;
  province: string | null;
  matches_played: number;
  is_seeking_team: boolean;
  distance_km: number;
};

/**
 * Las dos fallas esperables de la búsqueda, que la pantalla muestra como
 * estados propios en vez de como error: el delegado sin equipo o con el equipo
 * sin ubicación, y la cuenta que no es de delegado.
 */
export type SearchPlayersFailure = "origin_missing" | "delegates_only";

export type SearchPlayersResult =
  | { ok: true; rows: PlayerSearchRow[]; total: number }
  | { ok: false; reason: SearchPlayersFailure };

/**
 * Traduce el error de `search_players` a una falla esperable, o null si es
 * cualquier otra cosa.
 *
 * Se mira el código **y** el mensaje. Un `42501` sin `search_delegates_only`
 * no es "no sos delegado": es, por ejemplo, un grant que falta en la base
 * ("permission denied for function"). Tratarlo como `delegates_only` le
 * mostraría un 404 a un delegado de verdad y escondería el bug.
 *
 * Función pura y sin Supabase, como `mapStatsError`, para poder testear el
 * mapeo sin una base corriendo.
 */
export function mapSearchPlayersError(
  error: unknown,
): SearchPlayersFailure | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "P0001" && message === "search_origin_missing") {
    return "origin_missing";
  }

  if (code === "42501" && message === "search_delegates_only") {
    return "delegates_only";
  }

  return null;
}

/**
 * Jugadores cerca del equipo del delegado con sesión, del más cercano al más
 * lejano.
 *
 * Las fallas esperables vuelven como valor (`ok: false`) para que la pantalla
 * muestre su estado; cualquier otro error se lanza y lo agarra el
 * `error.tsx`. Un parámetro inválido también se lanza: la pantalla valida la
 * URL antes y nunca debería mandar uno.
 *
 * `total` sale de la primera fila. Con una página vacía (un `offset` más allá
 * del último resultado) no hay fila de donde leerlo y vale 0.
 */
export async function searchPlayers(
  client: Client,
  params: SearchPlayersParams,
): Promise<SearchPlayersResult> {
  const parsed = searchPlayersParamsSchema.parse(params);

  const { data, error } = await client.rpc("search_players", {
    p_radius_km: parsed.radius,
    // Sin posición se omite y la función usa su default (todas).
    ...(parsed.position ? { p_position: parsed.position } : {}),
    p_seeking_only: parsed.seekingOnly,
    p_limit: parsed.limit,
    p_offset: parsed.offset,
  });

  if (error) {
    const reason = mapSearchPlayersError(error);

    if (reason) {
      return { ok: false, reason };
    }

    throw error;
  }

  const results = data ?? [];

  return {
    ok: true,
    // Lista explícita de campos: si la función empezara a devolver una
    // columna nueva, no se filtra sola hacia la pantalla.
    rows: results.map((row) => ({
      player_id: row.player_id,
      full_name: row.full_name,
      avatar_path: row.avatar_path,
      position: row.position as Position | null,
      age: row.age,
      city: row.city,
      province: row.province,
      matches_played: row.matches_played,
      is_seeking_team: row.is_seeking_team,
      distance_km: row.distance_km,
    })),
    total: results[0]?.total_count ?? 0,
  };
}
