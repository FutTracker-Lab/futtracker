import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateAge } from "@/lib/format/age";
import type { Database } from "@/lib/supabase/database.types";

// Contrato de T11a (FUT-123) escrito antes de la tabla: cuando entre, manda su versión.

type Client = SupabaseClient<Database>;

export type VacancyApplication = {
  id: string;
  vacancy_id: string;
  vacancy: { position: string; status: string };
  player_id: string;
  full_name: string;
  avatar_path: string | null;
  position: string | null;
  city: string | null;
  age: number | null;
  created_at: string;
};

export async function listVacancyApplications(
  client: Client,
  { teamId, vacancyId }: { teamId: string; vacancyId?: string },
): Promise<VacancyApplication[]> {
  let query = client
    .from("vacancy_applications")
    .select(
      "id, vacancy_id, player_id, created_at, vacancies!inner(id, position, status, team_id), players!inner(birth_date, position, city, profiles!inner(full_name, avatar_path))",
    )
    .eq("vacancies.team_id", teamId);

  if (vacancyId) {
    query = query.eq("vacancy_id", vacancyId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    vacancy_id: row.vacancy_id,
    vacancy: { position: row.vacancies.position, status: row.vacancies.status },
    player_id: row.player_id,
    full_name: row.players.profiles.full_name,
    avatar_path: row.players.profiles.avatar_path,
    position: row.players.position,
    city: row.players.city,
    age: calculateAge(row.players.birth_date),
    created_at: row.created_at,
  }));
}

export async function countApplicationsByVacancy(
  client: Client,
  teamId: string,
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("vacancies")
    .select("id, vacancy_applications(count)")
    .eq("team_id", teamId);

  if (error) {
    throw error;
  }

  return Object.fromEntries(
    data.map((vacancy) => [vacancy.id, vacancy.vacancy_applications[0]?.count ?? 0]),
  );
}

// ---------------------------------------------------------------------------
// Lado del jugador (T11a): postularse, retirarse y "Mis postulaciones". Las
// dos funciones de arriba son las del delegado, escritas por Facu en FUT-129.
// ---------------------------------------------------------------------------

const MY_APPLICATIONS_LIMIT = 50;

// Forma larga de `Tables<"vacancy_applications">`, para no tocar el import de
// la parte de arriba.
export type VacancyApplicationRow =
  Database["public"]["Tables"]["vacancy_applications"]["Row"];

// Mismo patrón que `VacancyErrorKey`: claves para que la pantalla elija el
// texto, nunca el mensaje crudo de Postgres.
export type ApplicationErrorKey =
  | "alreadyApplied"
  | "vacancyClosed"
  | "profileIncomplete"
  | "forbidden"
  | "notFound"
  | "unexpected";

export class ApplicationError extends Error {
  constructor(readonly key: ApplicationErrorKey) {
    super(key);
    this.name = "ApplicationError";
  }
}

/**
 * Traduce el error de una postulación a su clave.
 *
 * El 23503 se mira junto con el nombre de la foránea: solo la de `player_id`
 * significa "perfil incompleto" (la cuenta no tiene fila en `players`). La de
 * `vacancy_id` es una vacante que no existe, y decirle al jugador que complete
 * su perfil sería mandarlo a arreglar algo que no está roto.
 */
export function applicationErrorKey(error: unknown): ApplicationErrorKey {
  if (error instanceof ApplicationError) {
    return error.key;
  }

  if (typeof error !== "object" || error === null) {
    return "unexpected";
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "23505") {
    return "alreadyApplied";
  }

  if (code === "23514" && message?.includes("vacancy_closed")) {
    return "vacancyClosed";
  }

  if (code === "23503" && message?.includes("vacancy_applications_player_id_fkey")) {
    return "profileIncomplete";
  }

  if (code === "42501") {
    return "forbidden";
  }

  return "unexpected";
}

async function sessionUserId(client: Client): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.id ?? null;
}

/**
 * Postula al jugador con sesión a una vacante. El `player_id` sale de la
 * sesión, nunca de un parámetro: la RLS lo exigiría igual, pero así no hay
 * forma de pedir otra cosa.
 *
 * Los errores de la base se lanzan tal cual; el que llama los traduce con
 * `applicationErrorKey` (ya postulado, vacante cerrada, perfil incompleto).
 */
export async function applyToVacancy(
  client: Client,
  vacancyId: string,
): Promise<VacancyApplicationRow> {
  const playerId = await sessionUserId(client);

  if (!playerId) {
    throw new ApplicationError("forbidden");
  }

  const { data, error } = await client
    .from("vacancy_applications")
    .insert({ vacancy_id: vacancyId, player_id: playerId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Retira una postulación propia: borrar la fila. La RLS decide si es propia;
 * una ajena o inexistente afecta 0 filas, y eso es `notFound`.
 */
export async function withdrawApplication(
  client: Client,
  applicationId: string,
): Promise<void> {
  const { data, error } = await client
    .from("vacancy_applications")
    .delete()
    .eq("id", applicationId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new ApplicationError("notFound");
  }
}

export type MyApplication = {
  id: string;
  created_at: string;
  vacancy: {
    id: string;
    position: string;
    modality: string;
    level: string;
    status: string;
    team: {
      id: string;
      name: string;
      city: string | null;
      crest_path: string | null;
    };
  };
};

/**
 * "Mis postulaciones": las del jugador con sesión, con la vacante y su equipo,
 * de la más nueva a la más vieja, hasta 50.
 *
 * El filtro por `player_id` es explícito aunque la RLS ya muestre solo las
 * propias a un jugador: la misma política le muestra al dueño de un equipo las
 * postulaciones a sus vacantes, y esto es "las mías", no "las que veo". Además
 * usa el índice `(player_id, created_at desc)`.
 *
 * Una vacante cerrada sigue apareciendo, con `status = 'closed'`: cerrarla no
 * borra las postulaciones.
 */
export async function listMyApplications(client: Client): Promise<MyApplication[]> {
  const playerId = await sessionUserId(client);

  if (!playerId) {
    return [];
  }

  const { data, error } = await client
    .from("vacancy_applications")
    .select(
      "id, created_at, vacancies!inner(id, position, modality, level, status, teams!inner(id, name, city, crest_path))",
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(MY_APPLICATIONS_LIMIT);

  if (error) {
    throw error;
  }

  // Lista explícita de campos: lo que se agregue al select no llega solo a la
  // pantalla.
  return data.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    vacancy: {
      id: row.vacancies.id,
      position: row.vacancies.position,
      modality: row.vacancies.modality,
      level: row.vacancies.level,
      status: row.vacancies.status,
      team: {
        id: row.vacancies.teams.id,
        name: row.vacancies.teams.name,
        city: row.vacancies.teams.city,
        crest_path: row.vacancies.teams.crest_path,
      },
    },
  }));
}
