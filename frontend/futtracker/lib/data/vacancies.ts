import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { positionSchema } from "@/lib/data/players";
import { getMyTeam } from "@/lib/data/teams";
import type { Database, Tables } from "@/lib/supabase/database.types";

// Contrato de T10a (FUT-120) escrito antes de la tabla: cuando entre, manda su versión.

type Client = SupabaseClient<Database>;

export type Vacancy = Tables<"vacancies">;

export const MODALITIES = ["futbol_11", "futbol_7"] as const;
export const LEVELS = ["recreativo", "intermedio", "competitivo"] as const;
export const VACANCY_STATUSES = ["open", "closed"] as const;

export type VacancyStatus = (typeof VACANCY_STATUSES)[number];

export const DESCRIPTION_MAX_LENGTH = 280;

// Repite los `check` de la migración de T10a.
export const vacancyInputSchema = z.object({
  position: positionSchema,
  modality: z.enum(MODALITIES),
  level: z.enum(LEVELS),
  // `max` antes de `trim`: mide lo mismo que el contador del formulario.
  description: z.string().max(DESCRIPTION_MAX_LENGTH).trim().nullable(),
});

export type VacancyInput = z.infer<typeof vacancyInputSchema>;

export type OpenVacancy = Vacancy & {
  teams: Pick<
    Tables<"teams">,
    "id" | "name" | "city" | "province" | "category" | "crest_path"
  > | null;
};

// Las claves `vacancies.errors.*` de T10a.
export type VacancyErrorKey =
  | "duplicateOpenPosition"
  | "fieldsLocked"
  | "forbidden"
  | "unexpected";

export class VacancyError extends Error {
  constructor(readonly key: VacancyErrorKey) {
    super(key);
    this.name = "VacancyError";
  }
}

export function vacancyErrorKey(error: unknown): VacancyErrorKey {
  if (error instanceof VacancyError) {
    return error.key;
  }

  if (typeof error !== "object" || error === null) {
    return "unexpected";
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "23505" && message?.includes("vacancies_one_open_per_position")) {
    return "duplicateOpenPosition";
  }

  if (code === "23514" && message?.includes("vacancy_fields_locked")) {
    return "fieldsLocked";
  }

  if (code === "42501") {
    return "forbidden";
  }

  return "unexpected";
}

export async function createVacancy(
  client: Client,
  input: VacancyInput,
): Promise<Vacancy> {
  const values = vacancyInputSchema.parse(input);
  const team = await getMyTeam(client);

  if (!team) {
    throw new VacancyError("forbidden");
  }

  const { data, error } = await client
    .from("vacancies")
    .insert({ team_id: team.id, ...values })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function setVacancyStatus(
  client: Client,
  id: string,
  status: VacancyStatus,
): Promise<Vacancy> {
  const team = await getMyTeam(client);

  if (!team) {
    throw new VacancyError("forbidden");
  }

  // El filtro por equipo repite la RLS: no depende solo de cómo quede la política de T10a.
  const { data, error } = await client
    .from("vacancies")
    .update({ status })
    .eq("id", id)
    .eq("team_id", team.id)
    .select("*");

  if (error) {
    throw error;
  }

  // La RLS no da error con una fila ajena: la filtra y el update afecta 0.
  if (!data?.length) {
    throw new VacancyError("forbidden");
  }

  return data[0];
}

export async function listTeamVacancies(
  client: Client,
  teamId: string,
): Promise<Vacancy[]> {
  const { data, error } = await client
    .from("vacancies")
    .select("*")
    .eq("team_id", teamId)
    // "open" > "closed" alfabéticamente: descendente deja las abiertas primero.
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listOpenVacancies(
  client: Client,
  {
    teamIds,
    position,
    limit,
    offset,
  }: {
    teamIds?: string[];
    position?: Vacancy["position"];
    limit: number;
    offset: number;
  },
): Promise<{ vacancies: OpenVacancy[]; total: number }> {
  let query = client
    .from("vacancies")
    .select("*, teams(id, name, city, province, category, crest_path)", {
      count: "exact",
    })
    .eq("status", "open");

  if (teamIds) {
    query = query.in("team_id", teamIds);
  }

  if (position) {
    query = query.eq("position", position);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return { vacancies: data, total: count ?? 0 };
}
