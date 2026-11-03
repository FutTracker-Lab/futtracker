"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  applicationErrorKey,
  applyToVacancy,
  withdrawApplication,
} from "@/lib/data/applications";
import type { ApplyErrorKey } from "@/lib/format/applicationLabels";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type ApplyActionResult = { ok: true } | { ok: false; error: ApplyErrorKey };
export type WithdrawActionResult = { ok: boolean };

const idSchema = z.uuid();

function revalidateApplicationPages() {
  revalidatePath(RouteConstants.vacancies.board);
  revalidatePath(RouteConstants.suggestions);
  revalidatePath("/equipos/[id]", "page");
}

export async function applyToVacancyAction(vacancyId: unknown): Promise<ApplyActionResult> {
  const parsed = idSchema.safeParse(vacancyId);

  if (!parsed.success) {
    return { ok: false, error: "unexpected" };
  }

  try {
    const supabase = await createClient();
    await applyToVacancy(supabase, parsed.data);
    revalidateApplicationPages();

    return { ok: true };
  } catch (error) {
    const key = applicationErrorKey(error);

    if (key === "alreadyApplied" || key === "vacancyClosed" || key === "profileIncomplete") {
      return { ok: false, error: key };
    }

    return { ok: false, error: "unexpected" };
  }
}

export async function withdrawApplicationAction(
  applicationId: unknown,
): Promise<WithdrawActionResult> {
  const parsed = idSchema.safeParse(applicationId);

  if (!parsed.success) {
    return { ok: false };
  }

  try {
    const supabase = await createClient();
    await withdrawApplication(supabase, parsed.data);
  } catch (error) {
    // Ya no existía (retirada en otra pestaña): lo que el jugador quería ya pasó.
    if (applicationErrorKey(error) !== "notFound") {
      return { ok: false };
    }
  }

  revalidateApplicationPages();

  return { ok: true };
}
