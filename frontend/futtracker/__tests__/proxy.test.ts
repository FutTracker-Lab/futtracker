import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "@/proxy";
import { updateSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn() }));

function session(user: { id: string } | null) {
  vi.mocked(updateSession).mockImplementation(async (request) => ({
    response: NextResponse.next({ request }),
    user: user as never,
  }));
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

  it("una ruta que solo empieza igual no queda protegida", async () => {
    session(null);

    const response = await request("/siguiendos");

    expect(response.headers.get("location")).toBeNull();
  });
});
