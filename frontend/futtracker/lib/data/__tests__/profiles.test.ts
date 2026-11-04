import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProfileById } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/players", () => ({ getAvatarSignedUrl: vi.fn() }));

const ID = "11111111-1111-4111-8111-111111111111";

function respondWith(result: { data: unknown; error: unknown }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => result,
  };

  vi.mocked(createClient).mockResolvedValue({ from: () => chain } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProfileById", () => {
  it("devuelve el perfil cuando existe", async () => {
    const profile = { id: ID, role: "delegate" };
    respondWith({ data: profile, error: null });

    await expect(getProfileById(ID)).resolves.toEqual({ kind: "found", profile });
  });

  it("devuelve notFound cuando no hay fila", async () => {
    respondWith({ data: null, error: null });

    await expect(getProfileById(ID)).resolves.toEqual({ kind: "notFound" });
  });

  it("devuelve error cuando falla la consulta, no null", async () => {
    respondWith({ data: null, error: { code: "42501", message: "permission denied" } });

    await expect(getProfileById(ID)).resolves.toEqual({ kind: "error" });
  });
});
