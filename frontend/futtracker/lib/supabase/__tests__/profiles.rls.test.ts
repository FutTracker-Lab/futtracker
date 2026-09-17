import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

describe.skipIf(!IS_LOCAL)("RLS de public.profiles", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;

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

    it("puede guardar un avatar bajo su propia carpeta", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .update({ avatar_path: `${playerA.id}/avatar.png` })
        .eq("id", playerA.id)
        .select("avatar_path");

      expect(data).toEqual([{ avatar_path: `${playerA.id}/avatar.png` }]);
    });

    it("NO puede apuntar su avatar al de otro jugador", async () => {
      const { error } = await playerA.client
        .from("profiles")
        .update({ avatar_path: `${playerB.id}/avatar.png` })
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });

    it("NO puede escaparse de su carpeta con ..", async () => {
      const { error } = await playerA.client
        .from("profiles")
        .update({ avatar_path: `${playerA.id}/../${playerB.id}/avatar.png` })
        .eq("id", playerA.id);

      expect(error?.code).toBe("42501");
    });

    it("puede volver a dejar el avatar en null", async () => {
      const { data } = await playerA.client
        .from("profiles")
        .update({ avatar_path: null })
        .eq("id", playerA.id)
        .select("avatar_path");

      expect(data).toEqual([{ avatar_path: null }]);
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
