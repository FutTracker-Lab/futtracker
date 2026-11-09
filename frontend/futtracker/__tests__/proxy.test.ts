import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "@/proxy";
import { updateSession, type SessionCheck } from "@/lib/supabase/proxy";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn() }));

function mockSession(session: SessionCheck, cookies: { name: string; value: string }[] = []) {
  vi.mocked(updateSession).mockImplementation(async (request) => {
    const response = NextResponse.next({ request });
    for (const cookie of cookies) {
      response.cookies.set(cookie);
    }
    return { response, session };
  });
}

function session(user: { id: string } | null) {
  mockSession(user ? { status: "signedIn", user: user as never } : { status: "signedOut" });
}

const request = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy", () => {
  it.each(["/siguiendo", "/siguiendo/algo"])("sin sesión, %s redirige al login con el destino", async (path) => {
    session(null);

    const response = await request(path);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirectTo")).toBe(path);
  });

  it("con sesión deja pasar /siguiendo", async () => {
    session({ id: "33333333-3333-4333-8333-333333333333" });

    const response = await request("/siguiendo");

    expect(response.headers.get("location")).toBeNull();
  });

  it("sin sesión deja pasar el POST de una Server Action: la action decide adónde va", async () => {
    session(null);

    const response = await proxy(
      new NextRequest("http://localhost:3000/vacantes", {
        method: "POST",
        headers: { "next-action": "abc123" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("sin sesión sigue redirigiendo un POST con el header vacío", async () => {
    session(null);

    const response = await proxy(
      new NextRequest("http://localhost:3000/vacantes", {
        method: "POST",
        headers: { "next-action": "" },
      }),
    );

    expect(response.status).toBe(307);
  });

  it("sin sesión sigue redirigiendo un POST que no es de una Server Action", async () => {
    session(null);

    const response = await proxy(
      new NextRequest("http://localhost:3000/vacantes", { method: "POST" }),
    );

    expect(response.status).toBe(307);
  });

  it("sin sesión sigue redirigiendo un GET aunque traiga el header", async () => {
    session(null);

    const response = await proxy(
      new NextRequest("http://localhost:3000/vacantes", {
        headers: { "next-action": "abc123" },
      }),
    );

    expect(response.status).toBe(307);
  });

  it("una ruta que solo empieza igual no queda protegida", async () => {
    session(null);

    const response = await request("/siguiendos");

    expect(response.headers.get("location")).toBeNull();
  });

  it("con Auth sin responder, una ruta protegida va al login con el aviso y el destino", async () => {
    mockSession({ status: "unavailable" });

    const response = await request("/sugerencias?radio=50");

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirectTo")).toBe("/sugerencias?radio=50");
    expect(location.searchParams.get("aviso")).toBe("servicio");
  });

  it("sin sesión, el login no lleva el aviso", async () => {
    session(null);

    const response = await request("/sugerencias");

    expect(new URL(response.headers.get("location")!).searchParams.has("aviso")).toBe(false);
  });

  it("con Auth sin responder, el redirect conserva las cookies de la respuesta", async () => {
    mockSession({ status: "unavailable" }, [{ name: "sb-test-auth-token", value: "rotado" }]);

    const response = await request("/vacantes");

    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("rotado");
  });

  it("con Auth sin responder, una ruta pública pasa", async () => {
    mockSession({ status: "unavailable" });

    const response = await request("/");

    expect(response.headers.get("location")).toBeNull();
  });

  it("con Auth sin responder, el POST de una Server Action pasa", async () => {
    mockSession({ status: "unavailable" });

    const response = await proxy(
      new NextRequest("http://localhost:3000/vacantes", {
        method: "POST",
        headers: { "next-action": "abc123" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
  });
});
