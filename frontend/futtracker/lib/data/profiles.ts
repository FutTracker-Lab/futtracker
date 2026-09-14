import { cache } from "react";

import { getAvatarSignedUrl, type Player } from "@/lib/data/players";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Profile = Tables<"profiles">;

export type PlayerProfile = {
  profile: Profile;
  player: Player | null;
  avatarUrl: string | null;
};

// `cache()` de React memoiza por argumentos dentro de un mismo render de
// servidor — acá el argumento es el `id` (un primitivo), así que dos
// llamadas con el mismo id en la misma request (ej. `generateMetadata` y la
// página) comparten una sola consulta a Supabase en vez de dos. El cliente
// se crea adentro a propósito: si se recibiera como parámetro, cada
// `createClient()` sería una instancia distinta y rompería la memoización
// por igualdad referencial.
export const getProfileById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
});

/**
 * Perfil de jugador completo en una sola consulta (requisito 1 de FUT-87):
 * `profiles` embebe `players` por la FK, que es 1:1 (`players.id` es PK y
 * apunta a `profiles.id`), así que PostgREST devuelve un objeto y no un
 * array.
 *
 * El embed va desde `profiles` y no desde `players` como sugiere la nota
 * técnica del ticket: con `players!inner(profiles)` un jugador sin ficha no
 * devolvería ninguna fila, y el requisito 8 pide justamente mostrar el
 * estado vacío de ese caso. Desde `profiles`, `players` viene en null.
 *
 * La URL firmada del avatar es una llamada aparte contra Storage: no es una
 * tabla, no se puede embeber en el mismo select.
 */
export const getPlayerProfileById = cache(
  async (id: string): Promise<PlayerProfile | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*, players(*)")
      .eq("id", id)
      .eq("role", "player")
      .maybeSingle();

    if (!data) {
      return null;
    }

    const { players, ...profile } = data;
    const avatarUrl = await getAvatarSignedUrl(supabase, profile.avatar_path);

    return { profile, player: players, avatarUrl };
  },
);
