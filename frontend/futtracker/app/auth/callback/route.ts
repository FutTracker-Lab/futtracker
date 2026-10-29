import { NextResponse, type NextRequest } from "next/server";

import { withErrorLog } from "@/lib/api/error-log";
import { homeForRole, safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// El inicio según el rol de la sesión recién canjeada.
async function sessionHome(supabase: ServerClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return homeForRole(profile?.role);
}

// Destino de emailRedirectTo/resetPasswordForEmail (ver
// lib/auth/constants.ts). Supabase Auth con @supabase/ssr usa el flujo PKCE:
// el link del mail trae un `code` que hay que canjear por una sesión acá,
// del lado del servidor, antes de que la página siguiente pueda usarla.
// Confirmado como pendiente en docs/auth.md, sección "Pendiente".
//
// Envuelto en `withErrorLog` para que un 5xx quede registrado (T22).
//
// `next` viene en la URL y cualquiera puede armar el link: pasa por
// `safeRedirectPath` (FUT-136). Si no es una ruta de la app, o no vino, el
// usuario va a su inicio según el rol.
export const GET = withErrorLog("/auth/callback", async (request: NextRequest) => {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination =
        safeRedirectPath(searchParams.get("next")) ?? (await sessionHome(supabase));

      // `new URL` y no `${origin}${destination}`: pegados como texto, un
      // destino como `@evil.com` convertía el origen en usuario y contraseña
      // de otro sitio.
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  return NextResponse.redirect(`${origin}/login`);
});
