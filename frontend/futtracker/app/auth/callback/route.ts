import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Destino de `emailRedirectTo`/`resetPasswordForEmail` (ver
// app/(auth)/actions.ts). Supabase Auth con @supabase/ssr usa el flujo PKCE:
// el link del mail trae un `code` que hay que canjear por una sesión acá,
// del lado del servidor, antes de que la página siguiente pueda usarla.
export async function GET(request: NextRequest) {
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
}
