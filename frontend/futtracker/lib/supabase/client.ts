import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para Client Components.
 *
 * Junto con `lib/supabase/server.ts` y `lib/supabase/proxy.ts`, este es el
 * único lugar del proyecto donde se llama a `createBrowserClient` o
 * `createServerClient`. Instanciarlos sueltos por ahí termina en clientes con
 * el manejo de cookies mal configurado y sesiones que no se refrescan.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
