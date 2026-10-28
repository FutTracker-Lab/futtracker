"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { followErrorKey, followTeam, unfollowTeam } from "@/lib/data/follows";
import type { FollowActionErrorKey } from "@/lib/format/followLabels";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type FollowActionResult = { ok: true } | { ok: false; error: FollowActionErrorKey };

const idSchema = z.uuid();

// Solo tras un cambio exitoso: con el equipo borrado, revalidar su página la vuelve un 404 y tapa el toast.
function revalidateFollowPages(teamId: string) {
  revalidatePath(RouteConstants.team.view(teamId));
  revalidatePath(RouteConstants.following);
}

export async function followTeamAction(teamId: unknown): Promise<FollowActionResult> {
  const parsed = idSchema.safeParse(teamId);

  if (!parsed.success) {
    return { ok: false, error: "unexpected" };
  }

  try {
    const supabase = await createClient();
    await followTeam(supabase, parsed.data);
  } catch (error) {
    const key = followErrorKey(error);

    if (key === "teamNotFound") {
      return { ok: false, error: key };
    }

    // Ya lo seguía (otra pestaña): el estado final es el que se pedía.
    if (key !== "alreadyFollowing") {
      return { ok: false, error: "unexpected" };
    }
  }

  revalidateFollowPages(parsed.data);

  return { ok: true };
}

export async function unfollowTeamAction(teamId: unknown): Promise<FollowActionResult> {
  const parsed = idSchema.safeParse(teamId);

  if (!parsed.success) {
    return { ok: false, error: "unexpected" };
  }

  try {
    const supabase = await createClient();
    await unfollowTeam(supabase, parsed.data);
  } catch {
    return { ok: false, error: "unexpected" };
  }

  revalidateFollowPages(parsed.data);

  return { ok: true };
}
