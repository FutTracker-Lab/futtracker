import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// `cache()` de React memoiza por argumentos dentro de un mismo render de
// servidor — acá el argumento es el `id` (un primitivo), así que dos
// llamadas con el mismo id en la misma request (ej. `generateMetadata` y la
// página) comparten una sola consulta a Supabase en vez de dos. Bug de
// review en PR #9. El cliente se crea adentro a propósito: si se recibiera
// como parámetro, cada `createClient()` sería una instancia distinta y
// rompería la memoización por igualdad referencial.
export const getProfileById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
});
