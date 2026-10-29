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

// Los payloads que probó QA en la #47 por HTTP real, como tests de regresión.
const HOSTILE = [
  "//evil.com",
  "///evil.com",
  "////evil.com",
  "/\\evil.com",
  "/\\/evil.com",
  "\\/evil.com",
  "/%5Cevil.com",
  "/%5C%5Cevil.com",
  "/%2F%2Fevil.com",
  "%2F%2Fevil.com",
  "//user@evil.com",
  "//evil.com@futtracker.vercel.app",
  "/\r\n/evil.com",
  "/%0D%0A/evil.com",
  "/\u0000evil.com",
  "/%00/evil.com",
  "/\t/evil.com",
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  " javascript:alert(1)",
  "data:text/html,hola",
  "https:evil.com",
  "https://evil.com",
  "\uff0f\uff0fevil.com",
  "/\uff0f\uff0fevil.com",
  "/..//evil.com",
  "/./..//evil.com",
  "/a/../..//evil.com",
  "/.%2e//evil.com",
  "/%2e%2e//evil.com",
  `//${"a".repeat(5000)}.com`,
];

describe("payloads hostiles", () => {
  // La propiedad que importa: lo que pase la regla se queda en el sitio. Si un
  // payload nuevo la rompe, este test lo marca aunque nadie lo haya listado.
  it.each(HOSTILE)("%s: o se rechaza, o se queda en el sitio con una ruta de la app", (value) => {
    const result = safeRedirectPath(value);

    if (result !== null) {
      const resolved = new URL(result, "http://futtracker.invalid");
      expect(resolved.origin).toBe("http://futtracker.invalid");
      expect(resolved.pathname.startsWith("//")).toBe(false);
    }
  });

  it.each([
    "/..//evil.com",
    "/./..//evil.com",
    "/a/../..//evil.com",
    "/%2e%2e//evil.com",
  ])("%s se rechaza: el navegador lo resuelve a la ruta //evil.com", (value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });

  it("una ruta con .. que sigue siendo de la app pasa", () => {
    expect(safeRedirectPath("/jugadores/../equipos")).toBe("/jugadores/../equipos");
  });

  it("una ruta larga de la app pasa; una larga hacia otro sitio, no", () => {
    const long = `/jugadores?q=${"a".repeat(5000)}`;
    expect(safeRedirectPath(long)).toBe(long);
    expect(safeRedirectPath(`//${"a".repeat(5000)}.com`)).toBeNull();
  });
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
