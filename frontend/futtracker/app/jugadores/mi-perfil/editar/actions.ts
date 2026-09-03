"use server";

import { revalidatePath } from "next/cache";

import { playerInputSchema, upsertPlayer } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";

export type UpdatePlayerResult =
  | { ok: true }
  | { ok: false; error: string };

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
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  try {
    await upsertPlayer(supabase, parsed.data);
  } catch {
    return { ok: false, error: "Ocurrió un error inesperado. Probá de nuevo." };
  }

  // La página de perfil (Server Component) cachea la fetch — sin esto,
  // después de guardar seguiría mostrando los valores viejos.
  revalidatePath("/jugadores/mi-perfil");
  revalidatePath(`/jugadores/${user.id}`);

  return { ok: true };
}
