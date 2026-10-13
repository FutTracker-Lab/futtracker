import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Mismo patrón que `VacancyErrorKey` y `ApplicationErrorKey`: claves para que
// la pantalla elija el texto, nunca el mensaje crudo de Postgres.
export type FollowErrorKey = "alreadyFollowing" | "teamNotFound" | "forbidden" | "unexpected";

export class FollowError extends Error {
  constructor(readonly key: FollowErrorKey) {
    super(key);
    this.name = "FollowError";
  }
}

/**
 * Traduce el error de un seguimiento a su clave.
 *
 * El 23503 se mira junto con el nombre de la foránea: solo la de `team_id`
 * significa "el equipo no existe". La de `follower_id` (a `profiles`) no
 * debería dispararse nunca, porque toda cuenta con sesión tiene su fila; si
 * pasara, no es un equipo que falta.
 */
export function followErrorKey(error: unknown): FollowErrorKey {
  if (error instanceof FollowError) {
    return error.key;
  }

  if (typeof error !== "object" || error === null) {
    return "unexpected";
  }

  const { code, message } = error as { code?: string; message?: string };

  if (code === "23505") {
    return "alreadyFollowing";
  }

  if (code === "23503" && message?.includes("team_follows_team_id_fkey")) {
    return "teamNotFound";
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
 * Sigue un equipo a nombre del usuario con sesión. Que sea un jugador lo
 * exige la RLS: un delegado rebota con 42501 (`forbidden`).
 *
 * Los errores de la base se lanzan tal cual; el que llama los traduce con
 * `followErrorKey`.
 */
export async function followTeam(client: Client, teamId: string): Promise<void> {
  const followerId = await sessionUserId(client);

  if (!followerId) {
    throw new FollowError("forbidden");
  }

  const { error } = await client
    .from("team_follows")
    .insert({ follower_id: followerId, team_id: teamId });

  if (error) {
    throw error;
  }
}

/**
 * Deja de seguir un equipo. Si no lo seguía, no es un error: el estado final
 * es el que se pedía.
 */
export async function unfollowTeam(client: Client, teamId: string): Promise<void> {
  const followerId = await sessionUserId(client);

  if (!followerId) {
    throw new FollowError("forbidden");
  }

  const { error } = await client
    .from("team_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("team_id", teamId);

  if (error) {
    throw error;
  }
}

export async function isFollowing(client: Client, teamId: string): Promise<boolean> {
  const followerId = await sessionUserId(client);

  if (!followerId) {
    return false;
  }

  const { data, error } = await client
    .from("team_follows")
    .select("team_id")
    .eq("follower_id", followerId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

/**
 * Cuántos siguen al equipo, por la función `team_follower_count`. No se puede
 * contar las filas desde acá: la RLS solo deja ver las propias, y un jugador
 * vería siempre 0 o 1.
 */
export async function getFollowerCount(client: Client, teamId: string): Promise<number> {
  const { data, error } = await client.rpc("team_follower_count", { p_team_id: teamId });

  if (error) {
    throw error;
  }

  return data;
}

export type FollowedTeam = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  category: string | null;
  crest_path: string | null;
};

/** "Siguiendo": los equipos que sigue el usuario, del más reciente al más viejo. */
export async function listFollowedTeams(client: Client): Promise<FollowedTeam[]> {
  const followerId = await sessionUserId(client);

  if (!followerId) {
    return [];
  }

  // El filtro por `follower_id` es explícito aunque la RLS ya muestre solo las
  // propias a un jugador: la misma política le muestra al dueño de un equipo
  // los seguidores del suyo, y esto es "los que yo sigo".
  const { data, error } = await client
    .from("team_follows")
    .select("created_at, teams!inner(id, name, city, province, category, crest_path)")
    .eq("follower_id", followerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(({ teams }) => ({
    id: teams.id,
    name: teams.name,
    city: teams.city,
    province: teams.province,
    category: teams.category,
    crest_path: teams.crest_path,
  }));
}

export type TeamFollower = {
  follower_id: string;
  full_name: string;
  avatar_path: string | null;
  // Del perfil de jugador, cuando existe: seguir no exige tenerlo completo.
  position: string | null;
  city: string | null;
  created_at: string;
};

/**
 * Los seguidores del equipo, del más reciente al más viejo. Solo el dueño
 * obtiene filas.
 *
 * La RLS ya limita esto, pero no alcanza sola: también le muestra a cada
 * seguidor su propia fila, y entonces un jugador que llamara a esta función
 * con un equipo que sigue se vería en la lista. Por eso se pregunta además si
 * quien llama es el dueño, en paralelo con la consulta.
 */
export async function listTeamFollowers(
  client: Client,
  teamId: string,
): Promise<TeamFollower[]> {
  const [owner, followers] = await Promise.all([
    client.rpc("is_team_owner", { team: teamId }),
    client
      .from("team_follows")
      .select("follower_id, created_at, profiles!inner(full_name, avatar_path, players(position, city))")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
  ]);

  if (owner.error) {
    throw owner.error;
  }

  if (followers.error) {
    throw followers.error;
  }

  if (!owner.data) {
    return [];
  }

  return followers.data.map((row) => ({
    follower_id: row.follower_id,
    full_name: row.profiles.full_name,
    avatar_path: row.profiles.avatar_path,
    position: row.profiles.players?.position ?? null,
    city: row.profiles.players?.city ?? null,
    created_at: row.created_at,
  }));
}
