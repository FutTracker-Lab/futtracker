import { cache } from "react";
import { z } from "zod";

import { getCrestSignedUrl, type Team } from "@/lib/data/teams";
import { createClient } from "@/lib/supabase/server";

export type TeamProfile = {
  team: Team;
  ownerName: string | null;
  crestUrl: string | null;
};

/**
 * Equipo con el nombre de su delegado en una sola consulta: `teams` embebe
 * `profiles` por la FK `teams_owner_id_fkey`, que apunta a una columna única
 * (`owner_id`), así que PostgREST devuelve un objeto y no un array.
 *
 * `cache()` de React memoiza por `id` dentro del mismo render, así que
 * `generateMetadata` y la página comparten la consulta en vez de hacer dos.
 *
 * La URL firmada del escudo es una llamada aparte contra Storage: no es una
 * tabla, no se puede embeber en el mismo select.
 */
export const getTeamProfileById = cache(
  async (id: string): Promise<TeamProfile | null> => {
    // FUT-158: un id que no es uuid no puede ser un equipo. Sin esto Postgres
    // lo rechaza con 22P02, el error se propaga y /equipos/no-es-uuid daba
    // 500 en vez de 404. `guid` y no `uuid`: acepta cualquier uuid con el
    // formato 8-4-4-4-12, como Postgres, sin exigir la versión RFC.
    if (!z.guid().safeParse(id).success) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("teams")
      .select("*, profiles!teams_owner_id_fkey(full_name)")
      .eq("id", id)
      .maybeSingle();

    // `maybeSingle()` devuelve `data: null` tanto cuando no hay fila como
    // cuando la consulta falla. Sin distinguirlos, un error transitorio de
    // red o de RLS se vería como un 404 y /mi-equipo mandaría a crear un
    // equipo que en realidad existe. Se propaga para que lo tome error.tsx,
    // igual que hace `getTeamById` en lib/data/teams.ts.
    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const { profiles, ...team } = data;
    const crestUrl = await getCrestSignedUrl(supabase, team.crest_path);

    return { team, ownerName: profiles?.full_name ?? null, crestUrl };
  },
);
