import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
  notificationErrorKey,
} from "@/lib/data/notifications";
import type { Database } from "@/lib/supabase/database.types";

type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null };

// Cada `await` de `from()` o `rpc()` recibe el siguiente resultado, en orden.
function fakeClient(results: Result[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  let next = 0;

  const from = vi.fn((table: string) => {
    calls.push({ method: "from", args: [table] });
    const chain: Record<string, unknown> = {};

    for (const method of ["select", "is", "order", "limit", "lt"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return chain;
      };
    }

    chain.then = (resolve: (value: Result) => unknown) => resolve(results[next++]);

    return chain;
  });

  const rpc = vi.fn(async (...args: unknown[]) => {
    calls.push({ method: "rpc", args });
    return results[next++];
  });

  return { client: { from, rpc } as unknown as SupabaseClient<Database>, calls };
}

const ROW = {
  id: "n1",
  type: "new_application",
  created_at: "2026-10-28T12:00:00Z",
  read_at: null,
  conversation_id: null,
  vacancy_id: "v1",
  actor: { id: "p1", full_name: "Sofía Ramírez", avatar_path: null },
  vacancy: { position: "arquero" },
};

describe("listNotifications", () => {
  it("pide 20 por defecto, del más nuevo al más viejo", async () => {
    const { client, calls } = fakeClient([{ data: [], error: null }]);

    await listNotifications(client);

    expect(calls.find((c) => c.method === "order")?.args).toEqual(["created_at", { ascending: false }]);
    expect(calls.find((c) => c.method === "limit")?.args).toEqual([20]);
    expect(calls.some((c) => c.method === "lt")).toBe(false);
  });

  it("con before pide solo las anteriores", async () => {
    const { client, calls } = fakeClient([{ data: [], error: null }]);

    await listNotifications(client, { before: ROW.created_at, limit: 5 });

    expect(calls.find((c) => c.method === "lt")?.args).toEqual(["created_at", ROW.created_at]);
    expect(calls.find((c) => c.method === "limit")?.args).toEqual([5]);
  });

  it("aplana la posición de la vacante y conserva el actor", async () => {
    const { client } = fakeClient([{ data: [ROW], error: null }]);

    expect(await listNotifications(client)).toEqual([
      {
        id: "n1",
        type: "new_application",
        created_at: ROW.created_at,
        read_at: null,
        conversation_id: null,
        vacancy_id: "v1",
        vacancy_position: "arquero",
        actor: { id: "p1", full_name: "Sofía Ramírez", avatar_path: null },
      },
    ]);
  });

  it("un actor que borró su cuenta llega como null", async () => {
    const row = { ...ROW, type: "new_message", vacancy_id: null, conversation_id: "c1", actor: null, vacancy: null };
    const { client } = fakeClient([{ data: [row], error: null }]);

    const [notification] = await listNotifications(client);

    expect(notification.actor).toBeNull();
    expect(notification.vacancy_position).toBeNull();
  });

  it("un error de la base se lanza tal cual", async () => {
    const error = { code: "42501", message: "permission denied" };
    const { client } = fakeClient([{ data: null, error }]);

    await expect(listNotifications(client)).rejects.toBe(error);
  });
});

describe("countUnreadNotifications", () => {
  it("cuenta sin traer filas, solo las sin leer", async () => {
    const { client, calls } = fakeClient([{ data: null, error: null, count: 3 }]);

    expect(await countUnreadNotifications(client)).toBe(3);
    expect(calls.find((c) => c.method === "select")?.args[1]).toEqual({ count: "exact", head: true });
    expect(calls.find((c) => c.method === "is")?.args).toEqual(["read_at", null]);
  });

  it("un error de la base se lanza tal cual", async () => {
    const error = { code: "42501", message: "permission denied" };
    const { client } = fakeClient([{ data: null, error, count: null }]);

    await expect(countUnreadNotifications(client)).rejects.toBe(error);
  });
});

describe("markNotificationsRead", () => {
  it("sin ids marca todas", async () => {
    const { client, calls } = fakeClient([{ data: 2, error: null }]);

    expect(await markNotificationsRead(client)).toBe(2);
    expect(calls.find((c) => c.method === "rpc")?.args).toEqual(["mark_notifications_read", {}]);
  });

  it("con ids manda solo esos", async () => {
    const { client, calls } = fakeClient([{ data: 1, error: null }]);

    await markNotificationsRead(client, ["n1"]);

    expect(calls.find((c) => c.method === "rpc")?.args).toEqual([
      "mark_notifications_read",
      { p_ids: ["n1"] },
    ]);
  });

  it("un error de la base se lanza tal cual", async () => {
    const error = { code: "42501", message: "permission denied for function mark_notifications_read" };
    const { client } = fakeClient([{ data: null, error }]);

    await expect(markNotificationsRead(client)).rejects.toBe(error);
  });
});

describe("notificationErrorKey", () => {
  it("42501 es forbidden", () => {
    expect(notificationErrorKey({ code: "42501", message: "permission denied" })).toBe("forbidden");
  });

  it.each([
    ["otro código", { code: "23514", message: "notifications_target" }],
    ["null", null],
    ["un string", "42501"],
  ])("%s es generic", (_case, error) => {
    expect(notificationErrorKey(error)).toBe("generic");
  });
});
