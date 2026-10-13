import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  single: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from.mockReturnValue({
      select: () => ({ eq: () => ({ single: mocks.single }) }),
    }),
  }),
}));

const { default: Home } = await import("../page");

async function renderLanding() {
  return renderToStaticMarkup(await Home());
}

function hrefOf(html: string, label: string) {
  const match = html.match(
    new RegExp(`<a[^>]*href="([^"]*)"[^>]*>(?:(?!</a>).)*${label}`),
  );
  return match?.[1].replaceAll("&amp;", "&");
}

describe("landing en /", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sin sesión", () => {
    beforeEach(() => {
      mocks.getUser.mockResolvedValue({ data: { user: null } });
    });

    it("muestra un solo h1 con el titular y no consulta tablas", async () => {
      const html = await renderLanding();

      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain("El fútbol amateur, con perfil propio.");
      expect(html).toContain("Vista previa con datos de ejemplo");
      expect(mocks.from).not.toHaveBeenCalled();
    });

    it("lleva cada CTA a registro o login", async () => {
      const html = await renderLanding();

      expect(hrefOf(html, "Ya tengo cuenta")).toBe("/login");
      expect(hrefOf(html, "Entrar")).toBe("/login");
      expect(hrefOf(html, "Crear cuenta")).toBe("/login?tab=crear-cuenta");
      expect(hrefOf(html, "Crear cuenta como jugador")).toBe(
        "/login?tab=crear-cuenta&rol=jugador",
      );
      expect(hrefOf(html, "Crear cuenta como delegado")).toBe(
        "/login?tab=crear-cuenta&rol=delegado",
      );
    });
  });

  describe("con sesión", () => {
    beforeEach(() => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-id" } } });
    });

    it.each([
      ["player", "/jugadores/mi-perfil"],
      ["delegate", "/equipos/mi-equipo"],
    ])("redirige a un %s a su inicio", async (role, path) => {
      mocks.single.mockResolvedValue({ data: { role } });

      await expect(Home()).rejects.toThrow(`NEXT_REDIRECT ${path}`);
    });
  });
});
