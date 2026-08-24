import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const URL_VALIDA = "https://abcdefghijklmnop.supabase.co";
const CLAVE_VALIDA = "sb_publishable_ejemplo";

/**
 * `lib/env/public.ts` valida al importarse, no al llamarse. Por eso cada caso
 * resetea el registro de módulos y vuelve a importar: si no, el primer import
 * queda cacheado y los casos siguientes no evalúan nada.
 */
describe("publicEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("expone los valores cuando las variables están bien cargadas", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_VALIDA);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", CLAVE_VALIDA);

    const { publicEnv } = await import("@/lib/env/public");

    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(URL_VALIDA);
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(CLAVE_VALIDA);
  });

  it("falla con un mensaje explícito si falta la clave publishable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_VALIDA);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(import("@/lib/env/public")).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("falla si la URL no es una URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "no-soy-una-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", CLAVE_VALIDA);

    await expect(import("@/lib/env/public")).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("acepta la URL del stack local, que no es un dominio de supabase.co", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", CLAVE_VALIDA);

    const { publicEnv } = await import("@/lib/env/public");

    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });

  it("rechaza una clave que no tiene el prefijo publishable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_VALIDA);
    // Una clave legacy `anon`: es un JWT, y el proyecto ya no las usa.
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "eyJhbGciOiJIUzI1NiJ9");

    await expect(import("@/lib/env/public")).rejects.toThrow(
      /sb_publishable_/,
    );
  });

  /**
   * El caso que motivó el chequeo: con `.min(1)`, el literal que devuelve
   * `vercel pull` para una variable marcada como Sensitive pasaba la
   * validación y el build salía verde con una clave inservible.
   */
  it("detecta el literal [SENSITIVE] y explica cómo arreglarlo", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "[SENSITIVE]");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "[SENSITIVE]");

    await expect(import("@/lib/env/public")).rejects.toThrow(/--no-sensitive/);
  });
});
