import { beforeAll, describe, expect, it } from "vitest";

import { listZones } from "@/lib/data/zones";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// El catálogo es de solo lectura para todos: las 88 zonas del AMBA las carga
// la migración, y solo cambia por migración.
describe.skipIf(!IS_LOCAL)("RLS de public.zones", () => {
  let anon: Client;
  let user: TestUser;

  beforeAll(async () => {
    anon = newClient();
    user = await signUpUser("player");
  });

  describe("lectura", () => {
    it("sin sesión no devuelve filas", async () => {
      const { data, error } = await anon.from("zones").select("id");

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("con sesión hay 88 zonas activas: 48 de CABA y 40 de Buenos Aires", async () => {
      const { data } = await user.client
        .from("zones")
        .select("province")
        .eq("is_active", true);

      const byProvince = (data ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.province] = (acc[row.province] ?? 0) + 1;
        return acc;
      }, {});

      expect(data).toHaveLength(88);
      expect(byProvince).toEqual({ CABA: 48, "Buenos Aires": 40 });
    });

    // Las dos que fija el ticket: las usan los criterios de T09a.
    it.each([
      ["pilar", -34.4587, -58.9142],
      ["san-isidro", -34.4708, -58.5286],
    ])("%s tiene las coordenadas que fija el ticket", async (id, latitude, longitude) => {
      const { data } = await user.client
        .from("zones")
        .select("latitude, longitude")
        .eq("id", id)
        .single();

      expect(data).toEqual({ latitude, longitude });
    });
  });

  describe("escritura", () => {
    it("un usuario no puede agregar zonas", async () => {
      const { error } = await user.client
        .from("zones")
        .insert({ id: "x", name: "X", province: "CABA", latitude: 0, longitude: 0 });

      expect(error?.code).toBe("42501");
    });

    // El criterio dice "afecta 0 filas", pero sin `grant update` el pedido
    // rebota antes con 42501, como en T08a, T10a y T11a. Corrección propuesta
    // en la PR.
    it("un usuario no puede modificar una zona", async () => {
      const { error } = await user.client
        .from("zones")
        .update({ latitude: 0 })
        .eq("id", "pilar");

      expect(error?.code).toBe("42501");
    });
  });

  describe("listZones", () => {
    it("devuelve las 88 activas y ninguna de las de prueba del seed", async () => {
      const zones = await listZones(user.client);
      const ids = zones.map((zone) => zone.id);

      expect(zones).toHaveLength(88);
      expect(ids).not.toContain("rosario");
      expect(ids).not.toContain("cordoba");
      expect(ids).not.toContain("mendoza");
    });

    it("devuelve exactamente id, name y province", async () => {
      const [first] = await listZones(user.client);

      expect(Object.keys(first).sort()).toEqual(["id", "name", "province"]);
    });

    it("ordena por provincia y después por nombre", async () => {
      const zones = await listZones(user.client);
      const sorted = [...zones].sort(
        (a, b) =>
          a.province.localeCompare(b.province, "es") || a.name.localeCompare(b.name, "es"),
      );

      expect(zones.map((zone) => zone.id)).toEqual(sorted.map((zone) => zone.id));
    });
  });
});
