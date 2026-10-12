import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Tables } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type PlayerHighlight = Tables<"player_highlights">;

export const HIGHLIGHTS_BUCKET = "highlights";
const HIGHLIGHT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

// El límite y los tipos repiten lo que ya imponen el trigger y el bucket: acá
// dan un error que el formulario puede mostrar, en vez del 400 de PostgREST o
// del rechazo del storage. Si cambia uno, cambia el otro.
export const MAX_HIGHLIGHTS_PER_PLAYER = 4;
export const HIGHLIGHT_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
export const HIGHLIGHT_MAX_BYTES = 52428800;
export const HIGHLIGHT_TITLE_MAX = 80;

export type HighlightActionResult = { ok: true } | { ok: false; error: string };

// Sin `id`, `player_id` ni `created_at`: los tres salen de la sesión o de la
// base, nunca de un formulario. `storage_path` sí, porque lo arma quien sube
// el archivo, pero la base lo ata a la carpeta del dueño con un check.
export const highlightInputSchema = z.object({
  title: z.string().trim().min(1).max(HIGHLIGHT_TITLE_MAX),
  storage_path: z.string().trim().min(1),
});

export type HighlightInput = z.infer<typeof highlightInputSchema>;

/**
 * `<player_id>/<uuid>.<ext>` — un solo nivel, que es lo que chequean las
 * políticas de storage y el check de `storage_path`. El uuid evita que el
 * path se repita cuando alguien sube dos clips con el mismo nombre de archivo
 * y, de paso, que la URL firmada anterior siga sirviendo el clip viejo.
 */
export function buildHighlightPath(
  playerId: string,
  fileName: string,
  uuid: string,
): string {
  // `split(".").pop()` sobre un nombre sin punto devuelve el nombre entero,
  // no `undefined`: sin el `lastIndexOf` un archivo llamado "clip" terminaba
  // como "<uuid>.clip".
  const dot = fileName.lastIndexOf(".");
  const extension =
    dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "mp4";

  return `${playerId}/${uuid}.${extension}`;
}

export async function listHighlights(
  client: Client,
  playerId: string,
): Promise<PlayerHighlight[]> {
  const { data, error } = await client
    .from("player_highlights")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Las URLs firmadas de varios clips en una sola llamada.
 *
 * En lote y no una por clip: la galería muestra hasta cuatro, y firmarlos de a
 * uno son cuatro round-trips al storage por cada render del perfil.
 *
 * Corre del lado del servidor con la sesión del usuario — nunca con
 * `service_role`. La RLS del bucket es la que decide qué se puede firmar; con
 * la clave de servicio se saltearía y cualquiera podría pedir la URL de
 * cualquier archivo.
 *
 * Devuelve un mapa path → URL. Los paths que el storage no pudo firmar (el
 * archivo ya no está, la fila quedó huérfana) simplemente no aparecen, para
 * que una galería con un clip roto muestre los otros tres en vez de fallar
 * entera.
 */
export async function getHighlightSignedUrls(
  client: Client,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  if (paths.length === 0) {
    return urls;
  }

  const { data, error } = await client.storage
    .from(HIGHLIGHTS_BUCKET)
    .createSignedUrls(paths, HIGHLIGHT_SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  for (const item of data) {
    if (item.signedUrl && !item.error) {
      urls.set(item.path ?? "", item.signedUrl);
    }
  }

  return urls;
}

export async function createHighlight(
  client: Client,
  playerId: string,
  input: HighlightInput,
): Promise<void> {
  const { error } = await client
    .from("player_highlights")
    .insert({ player_id: playerId, ...input });

  if (error) {
    throw error;
  }
}

/**
 * Borra el highlight: primero la fila, después el objeto.
 *
 * En ese orden a propósito. Si fallara el borrado del objeto, queda un archivo
 * huérfano en el bucket —deuda asumida, anotada en el ticket— pero el clip
 * desaparece de la galería, que es lo que el usuario pidió. Al revés, un fallo
 * al borrar la fila dejaría un highlight visible apuntando a un archivo que ya
 * no existe: la galería mostraría un clip roto.
 *
 * La RLS es la que decide si la fila es borrable; acá no se vuelve a chequear
 * el dueño. Si no lo es, el delete afecta 0 filas y no se toca el storage.
 */
export async function deleteHighlight(
  client: Client,
  id: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("player_highlights")
    .delete()
    .eq("id", id)
    .select("storage_path");

  if (error) {
    throw error;
  }

  const deleted = data?.[0];

  if (!deleted) {
    // La RLS rechazó el borrado o la fila no existe.
    return false;
  }

  const { error: storageError } = await client.storage
    .from(HIGHLIGHTS_BUCKET)
    .remove([deleted.storage_path]);

  if (storageError) {
    // La fila ya no existe, así que no se propaga: el clip desapareció de la
    // galería. Queda el path huérfano registrado para la limpieza que el
    // ticket deja como deuda.
    console.error(
      `[highlights] fila borrada pero el objeto quedó huérfano: ${deleted.storage_path}`,
      storageError,
    );
  }

  return true;
}
