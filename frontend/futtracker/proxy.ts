import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * En Next 16 el archivo `middleware.ts` está deprecado y se llama `proxy.ts`,
 * con el export nombrado `proxy` en vez de `middleware`. Mismo comportamiento.
 * Ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Refresca la sesión en cada request y saca a la calle a quien no la tenga.
 * Es un chequeo optimista de UX, no la autorización: esa la hacen RLS y los
 * chequeos dentro de cada Server Action.
 */
const PROTECTED_ROUTES = ["/jugadores", "/equipos"];

function requiresSession(pathname: string): boolean {
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return isProtected || pathname.endsWith("/editar");
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (user || !requiresSession(request.nextUrl.pathname)) {
    return response;
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("redirectTo", request.nextUrl.pathname);

  const redirect = NextResponse.redirect(login);

  // El refresh de sesión escribió las cookies en `response`, y `redirect` es
  // una respuesta nueva que no las tiene. Sin este traspaso se pierde la
  // cookie que acaba de rotar y la próxima request vuelve a refrescar, en
  // loop.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
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
