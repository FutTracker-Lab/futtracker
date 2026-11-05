import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { loginPathFromReferer } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Afuera de cualquier `try`: `redirect` es una excepción de Next y un `catch` la tragaría.
export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const requestHeaders = await headers();

    redirect(loginPathFromReferer(requestHeaders.get("referer")));
  }

  return { supabase, user };
}
