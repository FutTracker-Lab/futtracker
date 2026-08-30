import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const { NEXT_PUBLIC_SUPABASE_URL: URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: KEY } =
  publicEnv;

/**
 * Freno de mano. Estos tests dan de alta usuarios, así que apuntar a un
 * proyecto de la nube ensuciaría `dev` o, peor, `prod`. Si la URL no es local,
 * el archivo entero no corre.
 */
const IS_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(URL);

function newClient(): Client {
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpUser(role: "player" | "delegate") {
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

describe.skipIf(!IS_LOCAL)("RLS de public.profiles", () => {
  let anon: Client;
  let playerA: Awaited<ReturnType<typeof signUpUser>>;
  let playerB: Awaited<ReturnType<typeof signUpUser>>;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
  });

  describe("sin sesión", () => {
    it("no lee ninguna fila", async () => {
      const { data } = await anon.from("profiles").select("id");

      expect(data ?? []).toHaveLength(0);
    });

    it("no puede escribir", async () => {
      const { data } = await anon
        .from("profiles")
        .update({ full_name: "Anónimo" })
        .eq("id", playerA.id)
        .select();

      expect(data ?? []).toHaveLength(0);
    });
  });

  describe("alta de usuario", () => {
    it("el trigger crea el perfil con los datos del registro", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .select("full_name, role")
        .eq("id", playerA.id)
        .single();

      expect(data).toEqual({
        full_name: "Usuario RLS",
        role: "player",
      });
    });
  });

  describe("con sesión, sobre la fila propia", () => {
    it("puede editar el nombre", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .update({ full_name: "Nombre Editado" })
        .eq("id", playerA.id)
        .select("full_name");

      expect(data).toEqual([{ full_name: "Nombre Editado" }]);
    });

    /**
     * Supuesto 3 del Sprint 1: el rol se elige en el registro y no se edita
     * después. La política de RLS no alcanza para sostenerlo — controla la
     * fila, no la columna — así que lo sostiene el grant por columna. Si este
     * caso pasa a verde con el rol cambiado, cualquier jugador puede
     * ascenderse a delegate desde el navegador.
     */
    it("NO puede cambiarse el rol", async () => {
      const { error } = await playerA.client
        .from("profiles")
        .update({ role: "delegate" })
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");

      const { data } = await playerA.client
        .from("profiles")
        .select("role")
        .eq("id", playerA.id)
        .single();

      expect(data?.role).toBe("player");
    });

    it("NO puede insertar una fila a mano", async () => {
      const { error } = await playerA.client.from("profiles").insert({
        id: crypto.randomUUID(),
        role: "player",
        full_name: "Inventado",
      });

      expect(error?.code).toBe("42501");
    });

    it("NO puede borrar su fila: el borrado va por cascade", async () => {
      const { error } = await playerA.client
        .from("profiles")
        .delete()
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });
  });

  describe("con sesión, sobre la fila de otro", () => {
    it("la puede leer: los perfiles son visibles para quien tenga cuenta", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .select("id")
        .eq("id", playerB.id)
        .single();

      expect(data?.id).toBe(playerB.id);
    });

    it("NO la puede editar", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .update({ full_name: "Editado por otro" })
        .eq("id", playerB.id)
        .select();

      expect(data ?? []).toHaveLength(0);

      const { data: untouched } = await playerB.client
        .from("profiles")
        .select("full_name")
        .eq("id", playerB.id)
        .single();

      expect(untouched?.full_name).toBe("Usuario RLS");
    });
  });
});
