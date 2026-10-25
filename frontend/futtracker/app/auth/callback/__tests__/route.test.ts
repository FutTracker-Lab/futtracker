import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `localhost` y no `127.0.0.1`: `NextRequest` normaliza el origen a `localhost`.
const ORIGIN = "http://localhost:3000";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: ORIGIN,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
  }),
}));

const { GET } = await import("../route");

async function callback(query: string): Promise<string | null> {
  const response = await GET(new NextRequest(`${ORIGIN}/auth/callback?${query}`));

  return response.headers.get("location");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.single.mockResolvedValue({ data: { role: "player" } });
});

describe("/auth/callback", () => {
  it("con un destino de la app, termina ahí, con la query", async () => {
    expect(await callback("code=abc&next=%2Fjugadores%3Fradio%3D50")).toBe(
      `${ORIGIN}/jugadores?radio=50`,
    );
    // Destino válido: no hace falta buscar el rol.
    expect(mocks.single).not.toHaveBeenCalled();
  });

  it("con next=https://evil.com, termina en el inicio por rol", async () => {
    expect(await callback("code=abc&next=https://evil.com")).toBe(`${ORIGIN}/jugadores/mi-perfil`);
  });

  it("un delegado va a su inicio", async () => {
    mocks.single.mockResolvedValue({ data: { role: "delegate" } });

    expect(await callback("code=abc&next=//evil.com")).toBe(`${ORIGIN}/equipos/mi-equipo`);
  });

  it.each([
    ["protocolo relativo", "//evil.com"],
    ["barra invertida", "/%5Cevil.com"],
    ["arroba, que pegado al origen lo volvía usuario de otro sitio", "@evil.com"],
    ["barras codificadas dos veces", "%252F%252Fevil.com"],
  ])("%s: termina en el inicio por rol", async (_caso, next) => {
    const location = await callback(`code=abc&next=${next}`);

    expect(location).toBe(`${ORIGIN}/jugadores/mi-perfil`);
    expect(new URL(location!).host).toBe("localhost:3000");
  });

  it("sin next (la confirmación del alta), al inicio por rol", async () => {
    expect(await callback("code=abc")).toBe(`${ORIGIN}/jugadores/mi-perfil`);
  });

  it("sin perfil con rol, a la portada", async () => {
    mocks.single.mockResolvedValue({ data: null });

    expect(await callback("code=abc&next=https://evil.com")).toBe(`${ORIGIN}/`);
  });

  it("si el código no se puede canjear, al login, sin mirar next", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: "invalid" } });

    expect(await callback("code=abc&next=%2Fjugadores")).toBe(`${ORIGIN}/login`);
  });

  it("sin código, al login", async () => {
    expect(await callback("next=https://evil.com")).toBe(`${ORIGIN}/login`);
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
