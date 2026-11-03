import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  referer: vi.fn<() => string | null>(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

const client = { auth: { getUser: mocks.getUser } };

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => mocks.referer() }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const { requireSession } = await import("@/lib/auth/requireSession");

const USER = { id: "11111111-1111-4111-8111-111111111111" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  mocks.referer.mockReturnValue(null);
});

describe("requireSession", () => {
  it("con sesión devuelve el cliente y el usuario, sin redirigir", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: USER } });

    expect(await requireSession()).toEqual({ supabase: client, user: USER });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("sin sesión manda al login con la pantalla de origen", async () => {
    mocks.referer.mockReturnValue("http://localhost:3000/vacantes");

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?redirectTo=%2Fvacantes");
  });

  it("conserva la query de la pantalla de origen", async () => {
    mocks.referer.mockReturnValue("http://localhost:3000/equipos/mi-equipo?tab=vacantes");

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?redirectTo=%2Fequipos%2Fmi-equipo%3Ftab%3Dvacantes",
    );
  });

  it.each([
    ["sin header", null],
    ["un valor que no es una URL", "cualquier-cosa"],
    ["una ruta que resuelve a otro origen", "http://localhost:3000/%2F%2Fevil.com"],
  ])("%s manda al login sin destino", async (_name, referer) => {
    mocks.referer.mockReturnValue(referer);

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("de otro origen solo toma la ruta: el destino no puede salir de la app", async () => {
    mocks.referer.mockReturnValue("https://evil.com/vacantes");

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?redirectTo=%2Fvacantes");
  });
});
