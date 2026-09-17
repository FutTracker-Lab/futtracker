import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Andamiaje compartido de los tests de RLS: cada uno necesita clientes con
 * sesión propia y contra el stack local.
 */

export type Client = SupabaseClient<Database>;

const { NEXT_PUBLIC_SUPABASE_URL: URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY } =
  publicEnv;

/**
 * Freno de mano. Estos tests dan de alta usuarios, así que apuntar a un
 * proyecto de la nube ensuciaría `dev` o, peor, `prod`. Si la URL no es local,
 * los archivos que lo usan no corren.
 */
export const IS_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(URL);

export function newClient(): Client {
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signUpUser(role: "player" | "delegate") {
  const client = newClient();
  const email = `rls-${crypto.randomUUID()}@example.com`;

  const { data, error } = await client.auth.signUp({
    email,
    password: "password123",
    options: { data: { full_name: "Usuario RLS", role } },
  });

  if (error || !data.user) {
    throw new Error(`No se pudo dar de alta al usuario: ${error?.message}`);
  }

  return { client, id: data.user.id, email };
}

export type TestUser = Awaited<ReturnType<typeof signUpUser>>;
