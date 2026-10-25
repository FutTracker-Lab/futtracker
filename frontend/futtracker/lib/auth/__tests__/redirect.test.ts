import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));

const { homeForRole, safeRedirectPath } = await import("@/lib/auth/redirect");

describe("safeRedirectPath", () => {
  it.each([
    "/",
    "/jugadores/mi-perfil",
    "/equipos/mi-equipo",
    "/jugadores?radio=50",
    "/jugadores?radio=50&posicion=arquero&pagina=2",
    "/equipos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/editar",
    "/jugadores?q=hola%20mundo",
    "/vacantes#filtros",
  ])("deja pasar %s tal cual", (value) => {
    expect(safeRedirectPath(value)).toBe(value);
  });

  it.each([
    // Otro origen, con o sin esquema.
    ["https", "https://evil.com"],
    ["http", "http://evil.com/jugadores"],
    ["protocolo relativo", "//evil.com"],
    ["protocolo relativo con ruta", "//evil.com/jugadores"],
    ["barra invertida", "/\\evil.com"],
    ["dos barras invertidas", "\\\\evil.com"],
    ["barra invertida en el medio", "/jugadores\\..\\evil"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:text/html,hola"],
    // Caracteres que el navegador descarta al armar la URL.
    ["tab", "/\t/evil.com"],
    ["salto de línea", "/\n/evil.com"],
    ["espacio al principio", " /jugadores"],
    // Lo mismo, escondido con codificación.
    ["barras codificadas", "/%2F%2Fevil.com"],
    ["barras codificadas sin la primera", "%2F%2Fevil.com"],
    ["barra invertida codificada", "/%5Cevil.com"],
    ["tab codificado", "/%09/evil.com"],
    ["codificación rota", "/%E0%A4%A"],
    // Sin barra: relativo a la página actual, no a la app.
    ["ruta sin barra", "jugadores"],
    ["arroba", "@evil.com"],
    ["vacío", ""],
  ])("rechaza %s: %s", (_caso, value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });

  it.each([null, undefined, 123, ["/jugadores"], { href: "/jugadores" }])(
    "rechaza lo que no es un string: %s",
    (value) => {
      expect(safeRedirectPath(value)).toBeNull();
    },
  );
});

describe("homeForRole", () => {
  it("lleva a cada rol a su inicio", () => {
    expect(homeForRole("player")).toBe("/jugadores/mi-perfil");
    expect(homeForRole("delegate")).toBe("/equipos/mi-equipo");
  });

  it.each([null, undefined, "admin", ""])("sin un rol conocido (%s), a la portada", (role) => {
    expect(homeForRole(role)).toBe("/");
  });
});
