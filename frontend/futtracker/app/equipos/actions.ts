"use server";

import { revalidatePath } from "next/cache";

import {
  createTeam,
  getMyTeam,
  teamInputSchema,
  updateCrestPath,
  updateTeam,
} from "@/lib/data/teams";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type TeamActionResult =
  | { ok: true; teamId: string }
  | { ok: false; error: string; field?: string };

export type CrestActionResult = { ok: true } | { ok: false; error: string };

// Los dos únicos constraints que la UI puede llegar a violar. Postgres los
// reporta con el mismo código 23505, así que se distinguen por nombre: sin
// esto el usuario vería el error crudo del driver.
const DUPLICATE_MESSAGES: Record<string, { error: string; field?: string }> = {
  teams_owner_id_key: {
    error: "Ya tenés un equipo creado.",
  },
  teams_name_city_unique: {
    error: "Ya existe un equipo con ese nombre en esa ciudad.",
    field: "name",
  },
};

const UNEXPECTED = "Ocurrió un error inesperado. Probá de nuevo.";

// `unknown` y no el tipo del error: lo que tira supabase-js no está tipado y
// una Server Action es un endpoint público, así que nada garantiza la forma.
function duplicateFrom(error: unknown): { error: string; field?: string } | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code !== "23505") {
    return null;
  }

  for (const [constraint, result] of Object.entries(DUPLICATE_MESSAGES)) {
    if (message?.includes(constraint)) {
      return result;
    }
  }

  // Es un duplicado, pero de un constraint que esta pantalla no conoce.
  return { error: "Ese dato ya está en uso." };
}

export async function createTeamAction(input: unknown): Promise<TeamActionResult> {
  const parsed = teamInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Revisá los datos ingresados." };
  }

  const supabase = await createClient();

  try {
    const team = await createTeam(supabase, parsed.data);

    revalidatePath(RouteConstants.team.mine);
    revalidatePath(RouteConstants.team.view(team.id));

    return { ok: true, teamId: team.id };
  } catch (error) {
    const duplicate = duplicateFrom(error);
    return duplicate ? { ok: false, ...duplicate } : { ok: false, error: UNEXPECTED };
  }
}

export async function updateTeamAction(
  teamId: string,
  input: unknown,
): Promise<TeamActionResult> {
  const parsed = teamInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Revisá los datos ingresados." };
  }

  const supabase = await createClient();

  // La autorización real la hace la RLS de `teams` (solo el dueño puede
  // escribir su fila), pero se chequea acá también: sin esto, un update de
  // otro equipo no fallaría, simplemente afectaría cero filas y `.single()`
  // tiraría un error genérico que el usuario leería como "error inesperado".
  const myTeam = await getMyTeam(supabase);

  if (!myTeam || myTeam.id !== teamId) {
    return { ok: false, error: UNEXPECTED };
  }

  try {
    await updateTeam(supabase, teamId, parsed.data);

    revalidatePath(RouteConstants.team.mine);
    revalidatePath(RouteConstants.team.view(teamId));
    revalidatePath(RouteConstants.team.edit(teamId));

    return { ok: true, teamId };
  } catch (error) {
    const duplicate = duplicateFrom(error);
    return duplicate ? { ok: false, ...duplicate } : { ok: false, error: UNEXPECTED };
  }
}

/**
 * Guarda el path del escudo recién subido. El archivo lo sube el cliente
 * contra Storage; acá solo se persiste la referencia.
 *
 * `updateCrestPath` (T05a) ya valida que el path arranque con el id del
 * equipo, pero antes hay que comprobar que ese equipo sea el del usuario: una
 * Server Action es un endpoint POST público y el `teamId` llega del cliente.
 */
export async function updateTeamCrestPath(
  teamId: string,
  path: string,
): Promise<CrestActionResult> {
  const supabase = await createClient();
  const myTeam = await getMyTeam(supabase);

  if (!myTeam || myTeam.id !== teamId) {
    return { ok: false, error: UNEXPECTED };
  }

  try {
    await updateCrestPath(supabase, teamId, path);
  } catch {
    return { ok: false, error: "No pudimos guardar el escudo. Probá de nuevo." };
  }

  revalidatePath(RouteConstants.team.mine);
  revalidatePath(RouteConstants.team.view(teamId));
  revalidatePath(RouteConstants.team.edit(teamId));

  return { ok: true };
}
