import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Refresca la cookie de sesión en cada request. Lo consume `proxy.ts`, en la
 * raíz del paquete.
 *
 * El token de acceso de Supabase vence cada hora. Sin este refresco, un
 * Server Component ve al usuario como deslogueado apenas expira, aunque el
 * refresh token siga siendo válido.
 *
 * Ojo con el alcance: los docs de Next 16 dicen que Proxy sirve para chequeos
 * optimistas y no como solución de sesión ni de autorización. El redirect de
 * rutas protegidas lo agrega T03a acá, pero la autorización de verdad la
 * hacen RLS y los chequeos dentro de cada Server Action.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // No meter nada entre `createServerClient` y `getUser()`. `getUser()` valida
  // el token contra Supabase Auth y es lo que dispara el refresh de la cookie;
  // cualquier código en el medio que corte o retorne antes deja al usuario
  // deslogueado de forma intermitente, que es un bug carísimo de encontrar.
  await supabase.auth.getUser();

  return response;
}
