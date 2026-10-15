import { NextResponse, type NextRequest } from "next/server";

import { withErrorLog } from "@/lib/api/error-log";
import { createClient } from "@/lib/supabase/server";

// Destino de emailRedirectTo/resetPasswordForEmail (ver
// lib/auth/constants.ts). Supabase Auth con @supabase/ssr usa el flujo PKCE:
// el link del mail trae un `code` que hay que canjear por una sesión acá,
// del lado del servidor, antes de que la página siguiente pueda usarla.
// Confirmado como pendiente en docs/auth.md, sección "Pendiente".
//
// Envuelto en `withErrorLog` para que un 5xx quede registrado (T22).
export const GET = withErrorLog("/auth/callback", async (request: NextRequest) => {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
});
