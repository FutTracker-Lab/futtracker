import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * En Next 16 el archivo `middleware.ts` está deprecado y se llama `proxy.ts`,
 * con el export nombrado `proxy` en vez de `middleware`. Mismo comportamiento.
 * Ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Por ahora solo refresca la sesión. La protección de rutas
 * (`/jugadores/**`, `/equipos/**`, `/editar`) la agrega T03a.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todo menos los assets estáticos y las imágenes, que no tienen sesión que
     * refrescar y solo agregarían latencia.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
