import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Es `async` porque en Next 16 `cookies()` devuelve una promesa. Hay que crear
 * un cliente nuevo por request: guardarlo en un módulo compartido haría que
 * dos usuarios distintos terminen usando la misma sesión.
 *
 * Este cliente usa la clave publishable y respeta RLS. La autorización la
 * hacen las políticas de la base, no el código que llama acá.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies y `set` tira acá.
            // Se puede ignorar: el proxy ya refrescó la sesión antes de que
            // esta request llegara a renderizarse.
          }
        },
      },
    },
  );
}
