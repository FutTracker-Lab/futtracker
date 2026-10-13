import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { isUnknownZoneError, listZones, UNKNOWN_ZONE_MESSAGE } from "@/lib/data/zones";
import type { Database } from "@/lib/supabase/database.types";

// Cadena que se puede esperar desde cualquier punto y registra cada llamada,
// como el falso de `applications.test.ts`.
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = new Proxy(
    {},
    {
      get(_, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => void) => resolve(result);
        }
        return (...args: unknown[]) => {
          calls.push({ method, args });
          return chain;
        };
      },
    },
  );
  const client = { from: (table: string) => (calls.push({ method: "from", args: [table] }), chain) };

  return { client: client as unknown as SupabaseClient<Database>, calls };
}

describe("listZones", () => {
  it("pide solo las activas, sin coordenadas, por provincia y nombre", async () => {
    const zones = [{ id: "almagro", name: "Almagro", province: "CABA" }];
    const { client, calls } = fakeClient({ data: zones, error: null });

    await expect(listZones(client)).resolves.toEqual(zones);
    expect(calls).toEqual([
      { method: "from", args: ["zones"] },
      { method: "select", args: ["id, name, province"] },
      { method: "eq", args: ["is_active", true] },
      { method: "order", args: ["province"] },
      { method: "order", args: ["name"] },
    ]);
  });

  it("propaga el error de la consulta", async () => {
    const error = { code: "PGRST000", message: "fetch failed" };
    const { client } = fakeClient({ data: null, error });

    await expect(listZones(client)).rejects.toBe(error);
  });
});

describe("isUnknownZoneError", () => {
  const fk = (constraint: string) => ({
    code: "23503",
    message: `insert or update on table "x" violates foreign key constraint "${constraint}"`,
  });

  it.each([["players_zone_id_fkey"], ["teams_zone_id_fkey"]])(
    "reconoce la foránea %s",
    (constraint) => {
      expect(isUnknownZoneError(fk(constraint))).toBe(true);
    },
  );

  // `teams.owner_id` y `players.id` también son foráneas: un 23503 de esas no
  // es "elegí una zona".
  it.each([["teams_owner_id_fkey"], ["players_id_fkey"]])(
    "no confunde la foránea %s con una zona",
    (constraint) => {
      expect(isUnknownZoneError(fk(constraint))).toBe(false);
    },
  );

  it.each([
    ["otro código", { code: "23505", message: "players_zone_id_fkey" }],
    ["algo que no es un objeto", "boom"],
    ["null", null],
  ])("devuelve false para %s", (_caso, error) => {
    expect(isUnknownZoneError(error)).toBe(false);
  });

  it("el mensaje es el que pide el ticket", () => {
    expect(UNKNOWN_ZONE_MESSAGE).toBe("Elegí una zona de la lista.");
  });
});
