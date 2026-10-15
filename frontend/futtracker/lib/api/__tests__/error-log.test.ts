import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `after` se reemplaza por una cola que el test vacía a mano: así se ve qué se
 * programó y se puede comprobar que la respuesta ya estaba armada antes de
 * que corriera el registro.
 */
const scheduled: Array<() => unknown> = [];
const afterMock = vi.fn((callback: () => unknown) => {
  scheduled.push(callback);
});
const rpcMock = vi.fn();

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (callback: () => unknown) => afterMock(callback) };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));

const { withErrorLog } = await import("@/lib/api/error-log");

function request(method = "GET"): NextRequest {
  return new Request("http://127.0.0.1:3000/api/health", { method }) as NextRequest;
}

async function flush() {
  while (scheduled.length > 0) {
    await scheduled.shift()!();
  }
}

beforeEach(() => {
  scheduled.length = 0;
  afterMock.mockClear();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: null, error: null });
});

describe("withErrorLog", () => {
  it("no registra una respuesta 2xx ni 4xx", async () => {
    const ok = withErrorLog("/api/health", () => new Response(null, { status: 200 }));
    const notFound = withErrorLog("/api/health", () => new Response(null, { status: 404 }));

    await ok(request());
    await notFound(request());
    await flush();

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("registra una respuesta 500 con ruta, método y código, y la devuelve tal cual", async () => {
    const original = new Response("boom", { status: 500 });
    const handler = withErrorLog("/api/health", () => original);

    const response = await handler(request("POST"));

    expect(response).toBe(original);
    // Programado, no ejecutado: el registro corre después de la respuesta.
    expect(rpcMock).not.toHaveBeenCalled();

    await flush();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("log_api_error", {
      p_route: "/api/health",
      p_method: "POST",
      p_status: 500,
    });
  });

  it.each([502, 503, 599])("registra un %i", async (status) => {
    const handler = withErrorLog("/auth/callback", () => new Response(null, { status }));

    await handler(request());
    await flush();

    expect(rpcMock).toHaveBeenCalledWith("log_api_error", {
      p_route: "/auth/callback",
      p_method: "GET",
      p_status: status,
    });
  });

  it("si el handler tira, registra un 500 y relanza el mismo error", async () => {
    const boom = new Error("boom");
    const handler = withErrorLog("/api/health", () => {
      throw boom;
    });

    await expect(handler(request())).rejects.toBe(boom);
    await flush();

    expect(rpcMock).toHaveBeenCalledWith("log_api_error", {
      p_route: "/api/health",
      p_method: "GET",
      p_status: 500,
    });
  });

  it("deja pasar un redirect() de Next sin registrarlo", async () => {
    const handler = withErrorLog("/auth/callback", () => redirect("/login"));

    await expect(handler(request())).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    await flush();

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("si la base rechaza el registro, el cliente recibe el mismo 500", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "42P01", message: "no existe" } });
    const original = new Response("boom", { status: 500 });
    const handler = withErrorLog("/api/health", () => original);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await handler(request());
    await expect(flush()).resolves.toBeUndefined();

    expect(response).toBe(original);
    expect(response.status).toBe(500);
    consoleError.mockRestore();
  });

  it("si la llamada a la base tira, el registro no propaga el error", async () => {
    rpcMock.mockRejectedValue(new TypeError("fetch failed"));
    const handler = withErrorLog("/api/health", () => new Response(null, { status: 500 }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await handler(request());
    await expect(flush()).resolves.toBeUndefined();

    expect(response.status).toBe(500);
    consoleError.mockRestore();
  });

  it("si after() mismo falla, la respuesta no cambia", async () => {
    afterMock.mockImplementationOnce(() => {
      throw new Error("after fuera de contexto");
    });
    const original = new Response(null, { status: 503 });
    const handler = withErrorLog("/api/health", () => original);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handler(request())).resolves.toBe(original);
    consoleError.mockRestore();
  });
});
