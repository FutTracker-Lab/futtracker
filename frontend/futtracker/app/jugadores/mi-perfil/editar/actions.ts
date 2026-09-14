"use server";

import { revalidatePath } from "next/cache";

import { playerInputSchema, upsertPlayer } from "@/lib/data/players";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type UpdatePlayerResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Guarda el path del avatar recién subido. La subida del archivo la hace el
 * cliente (AvatarUploader) contra Storage; acá solo se persiste la
 * referencia.
 *
 * El path se valida contra la sesión y no se confía en el que manda el
 * cliente: una Server Action es un endpoint POST público, así que sin este
 * chequeo alguien podría apuntar su perfil al avatar de otro. La política de
 * `profiles_update` en la base exige lo mismo (`^<id>/[^/]+$`) — esto es la
 * primera barrera, no la única.
 */
export async function updateAvatarPath(path: string): Promise<UpdatePlayerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  if (!new RegExp(`^${user.id}/[^/]+$`).test(path)) {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "No pudimos guardar la foto. Probá de nuevo." };
  }

  revalidatePath(RouteConstants.profile.mine);
  revalidatePath(RouteConstants.profile.edit);
  revalidatePath(RouteConstants.profile.view(user.id));

  return { ok: true };
}

export async function updatePlayerProfile(
  input: unknown,
  fullName: string,
): Promise<UpdatePlayerResult> {
  const parsed = playerInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Revisá los datos ingresados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  // `full_name` vive en `profiles`, no en `players` — dos escrituras. El
  // grant de `profiles` limita las columnas editables a `full_name` y
  // `avatar_path` (ver docs/auth.md), así que esto no puede tocar `role`.
  //
  // No bloqueante de review en PR #9: sin transacción, si la segunda
  // escritura falla queda desincronizado. No hay forma de envolver esto en
  // una transacción real desde acá — supabase-js no expone `BEGIN`/`COMMIT`
  // para dos tablas, y un RPC que sí lo haga es cambio de backend, fuera de
  // alcance de este ticket (frontend-only). Mitigación parcial: se escribe
  // primero `players` (el dato que le importa a este ticket) y `full_name`
  // después, así un fallo en el segundo paso deja el perfil funcionalmente
  // completo con el nombre desactualizado, en vez de con un nombre nuevo
  // pero sin fila de jugador.
  try {
    await upsertPlayer(supabase, parsed.data);
  } catch {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  // La página de perfil (Server Component) cachea la fetch — sin esto,
  // después de guardar seguiría mostrando los valores viejos.
  revalidatePath(RouteConstants.profile.mine);
  revalidatePath(RouteConstants.profile.view(user.id));

  return { ok: true };
}
