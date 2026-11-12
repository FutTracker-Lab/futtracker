import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
}));

// Doble de la cadena que usa `getTeamProfileById`. Que la consulta devuelva lo
// correcto contra la base lo prueban los tests de RLS de `teams`.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (...args: unknown[]) => {
      mocks.from(...args);
      return {
        select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      };
    },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }) }) },
  }),
}));

const { getTeamProfileById } = await import("@/lib/data/teamProfiles");

describe("getTeamProfileById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // FUT-158: Postgres rechaza un id que no es uuid con 22P02, el error se
  // propagaba y /equipos/no-es-uuid respondía 500 en vez de 404.
  it.each(["no-es-uuid", "123", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa"])(
    "con un id que no es uuid (%s) devuelve null sin consultar",
    async (id) => {
      expect(await getTeamProfileById(id)).toBeNull();
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );

  it("con un uuid de un equipo que no existe devuelve null", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await getTeamProfileById("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(mocks.from).toHaveBeenCalledWith("teams");
  });

  it("un error de la consulta se sigue propagando", async () => {
    const failure = { code: "08006", message: "connection failure" };
    mocks.maybeSingle.mockResolvedValue({ data: null, error: failure });

    await expect(getTeamProfileById("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).rejects.toBe(failure);
  });
});
