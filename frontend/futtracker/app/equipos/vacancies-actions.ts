"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  VACANCY_STATUSES,
  createVacancy,
  setVacancyStatus,
  vacancyErrorKey,
  vacancyInputSchema,
  type Vacancy,
} from "@/lib/data/vacancies";
import { REOPEN_DUPLICATE_MESSAGE, VACANCY_ERROR_MESSAGES } from "@/lib/format/vacancyLabels";
import { RouteConstants } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type VacancyActionResult = { ok: true } | { ok: false; error: string };

const statusChangeSchema = z.object({
  id: z.uuid(),
  status: z.enum(VACANCY_STATUSES),
});

function revalidateTeamPages(vacancy: Vacancy) {
  revalidatePath(RouteConstants.team.mine);
  revalidatePath(RouteConstants.team.view(vacancy.team_id));
}

export async function createVacancyAction(
  input: unknown,
): Promise<VacancyActionResult> {
  const parsed = vacancyInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Revisá los datos ingresados." };
  }

  try {
    const supabase = await createClient();
    const vacancy = await createVacancy(supabase, parsed.data);

    revalidateTeamPages(vacancy);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: VACANCY_ERROR_MESSAGES[vacancyErrorKey(error)] };
  }
}

export async function setVacancyStatusAction(
  id: unknown,
  status: unknown,
): Promise<VacancyActionResult> {
  const parsed = statusChangeSchema.safeParse({ id, status });

  if (!parsed.success) {
    return { ok: false, error: VACANCY_ERROR_MESSAGES.forbidden };
  }

  try {
    const supabase = await createClient();
    const vacancy = await setVacancyStatus(
      supabase,
      parsed.data.id,
      parsed.data.status,
    );

    revalidateTeamPages(vacancy);

    return { ok: true };
  } catch (error) {
    const key = vacancyErrorKey(error);

    return {
      ok: false,
      error:
        key === "duplicateOpenPosition"
          ? REOPEN_DUPLICATE_MESSAGE
          : VACANCY_ERROR_MESSAGES[key],
    };
  }
}
