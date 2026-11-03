"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/requireSession";
import {
  HIGHLIGHT_ERRORS,
  mapHighlightInsertError,
} from "@/lib/data/highlightErrors";
import {
  createHighlight,
  deleteHighlight,
  highlightInputSchema,
  type HighlightActionResult,
} from "@/lib/data/highlights";
import { RouteConstants } from "@/lib/routes";

function revalidateHighlights(userId: string) {
  revalidatePath(RouteConstants.profile.mine);
  revalidatePath(RouteConstants.profile.view(userId));
}

export async function addHighlight(input: unknown): Promise<HighlightActionResult> {
  const { supabase, user } = await requireSession();
  const parsed = highlightInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: HIGHLIGHT_ERRORS.unexpected };
  }

  if (!new RegExp(`^${user.id}/[^/]+$`).test(parsed.data.storage_path)) {
    return { ok: false, error: HIGHLIGHT_ERRORS.unexpected };
  }

  try {
    await createHighlight(supabase, user.id, parsed.data);
  } catch (error) {
    return { ok: false, error: mapHighlightInsertError(error as { code?: string }) };
  }

  revalidateHighlights(user.id);

  return { ok: true };
}

export async function removeHighlight(id: string): Promise<HighlightActionResult> {
  const { supabase, user } = await requireSession();

  try {
    if (!(await deleteHighlight(supabase, id))) {
      return { ok: false, error: HIGHLIGHT_ERRORS.deleteFailed };
    }
  } catch {
    return { ok: false, error: HIGHLIGHT_ERRORS.deleteFailed };
  }

  revalidateHighlights(user.id);

  return { ok: true };
}
