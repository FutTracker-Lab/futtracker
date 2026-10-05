"use server";

import { revalidatePath } from "next/cache";

import {
  careerEntryInputSchema,
  createCareerEntry,
  deleteCareerEntry,
  getCareerEntryById,
  updateCareerEntry,
} from "@/lib/data/careerEntries";
import { matchStatInputSchema, type MatchStat } from "@/lib/data/stats";
import { mapStatsError, UNEXPECTED_STATS_ERROR } from "@/lib/data/statsErrors";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type EntryActionResult =
  | { ok: true; entryId: string }
  | { ok: false; error: string; field?: string };

export type MatchActionResult =
  | { ok: true; matchId: string }
  | { ok: false; error: string; field?: string };

export type DeleteActionResult = { ok: true } | { ok: false; error: string };

const VALIDATION_ERROR = { ok: false as const, error: "Revisá los datos ingresados." };

function revalidateCareer(playerId: string) {
  revalidatePath(RouteConstants.profile.career);
  revalidatePath(RouteConstants.profile.view(playerId));
}

function revalidateMatches(playerId: string, entryId: string) {
  revalidateCareer(playerId);
  revalidatePath(RouteConstants.profile.careerMatches(entryId));
}

export async function createCareerEntryAction(
  input: unknown,
): Promise<EntryActionResult> {
  const parsed = careerEntryInputSchema.safeParse(input);

  if (!parsed.success) {
    return VALIDATION_ERROR;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  try {
    const entry = await createCareerEntry(supabase, parsed.data);
    revalidateCareer(user.id);
    return { ok: true, entryId: entry.id };
  } catch (error) {
    return { ok: false, ...mapStatsError(error) };
  }
}

export async function updateCareerEntryAction(
  entryId: string,
  input: unknown,
): Promise<EntryActionResult> {
  const parsed = careerEntryInputSchema.safeParse(input);

  if (!parsed.success) {
    return VALIDATION_ERROR;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  try {
    // La RLS de `career_entries` ya restringe la escritura al dueño, pero se
    // chequea acá también: mismo motivo que `updateTeamAction` — sin esto, un
    // update ajeno afecta cero filas y `.single()` tira un error genérico que
    // el usuario leería como "error inesperado" en vez de un 404 más arriba.
    const entry = await getCareerEntryById(supabase, entryId);

    if (!entry || entry.player_id !== user.id) {
      return { ok: false, ...UNEXPECTED_STATS_ERROR };
    }

    const updated = await updateCareerEntry(supabase, entryId, parsed.data);
    revalidateCareer(user.id);
    revalidatePath(RouteConstants.profile.careerEdit(entryId));
    revalidatePath(RouteConstants.profile.careerMatches(entryId));
    return { ok: true, entryId: updated.id };
  } catch (error) {
    return { ok: false, ...mapStatsError(error) };
  }
}

export async function deleteCareerEntryAction(
  entryId: string,
): Promise<DeleteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: UNEXPECTED_STATS_ERROR.error };
  }

  try {
    const entry = await getCareerEntryById(supabase, entryId);

    if (!entry || entry.player_id !== user.id) {
      return { ok: false, error: UNEXPECTED_STATS_ERROR.error };
    }

    await deleteCareerEntry(supabase, entryId);
    revalidateCareer(user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: UNEXPECTED_STATS_ERROR.error };
  }
}

async function findOwnedMatch(
  client: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  userId: string,
): Promise<MatchStat | null> {
  const { data, error } = await client
    .from("match_stats")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data && data.player_id === userId ? data : null;
}

export async function createMatchStatAction(
  entryId: string,
  input: unknown,
): Promise<MatchActionResult> {
  const parsed = matchStatInputSchema.safeParse(input);

  if (!parsed.success) {
    return VALIDATION_ERROR;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  const entry = await getCareerEntryById(supabase, entryId);

  if (!entry || entry.player_id !== user.id) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  try {
    // `career_entry_id` se fuerza al de la ruta y no al que venga en
    // `parsed.data`: el formulario ya lo manda igual, pero un POST armado a
    // mano podría apuntar a otra etapa (propia o ajena) mientras la
    // comprobación de dueño de acá arriba se hizo contra `entryId`.
    const { data, error } = await supabase
      .from("match_stats")
      .insert({ ...parsed.data, career_entry_id: entryId, player_id: user.id })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    revalidateMatches(user.id, entryId);
    return { ok: true, matchId: data.id };
  } catch (error) {
    return { ok: false, ...mapStatsError(error) };
  }
}

export async function updateMatchStatAction(
  entryId: string,
  matchId: string,
  input: unknown,
): Promise<MatchActionResult> {
  const parsed = matchStatInputSchema.safeParse(input);

  if (!parsed.success) {
    return VALIDATION_ERROR;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  const existing = await findOwnedMatch(supabase, matchId, user.id);

  if (!existing || existing.career_entry_id !== entryId) {
    return { ok: false, ...UNEXPECTED_STATS_ERROR };
  }

  try {
    // Mismo motivo que en `createMatchStatAction`: `career_entry_id` no sale
    // de `parsed.data`, para que un update no pueda "mudar" el partido a otra
    // etapa (propia o ajena) además de editarlo.
    const { data, error } = await supabase
      .from("match_stats")
      .update({ ...parsed.data, career_entry_id: entryId })
      .eq("id", matchId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    revalidateMatches(user.id, entryId);
    return { ok: true, matchId: data.id };
  } catch (error) {
    return { ok: false, ...mapStatsError(error) };
  }
}

export async function deleteMatchStatAction(
  entryId: string,
  matchId: string,
): Promise<DeleteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: UNEXPECTED_STATS_ERROR.error };
  }

  const existing = await findOwnedMatch(supabase, matchId, user.id);

  if (!existing || existing.career_entry_id !== entryId) {
    return { ok: false, error: UNEXPECTED_STATS_ERROR.error };
  }

  const { error } = await supabase.from("match_stats").delete().eq("id", matchId);

  if (error) {
    return { ok: false, error: mapStatsError(error).error };
  }

  revalidateMatches(user.id, entryId);
  return { ok: true };
}

/**
 * Trae la etapa a la que apunta "Partidos cargados" del sidebar: la vigente
 * si hay una, o la más reciente por fecha de inicio. `getCareerEntryById` no
 * sirve acá porque no hay un `entryId` de partida — es la propia página de
 * índice (`trayectoria/partidos/page.tsx`) la que resuelve el redirect.
 */
export async function getDefaultCareerEntryIdForCurrentUser(): Promise<
  string | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("career_entries")
    .select("id")
    .eq("player_id", user.id)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}
