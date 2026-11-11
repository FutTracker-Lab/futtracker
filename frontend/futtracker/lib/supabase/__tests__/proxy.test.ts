import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  },
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const user = { id: "33333333-3333-4333-8333-333333333333" };

function getUserReturns(result: { user: typeof user | null; error: Error | null }) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getUser: async () => ({ data: { user: result.user }, error: result.error }),
    },
  } as never);
}

const run = () => updateSession(new NextRequest("http://localhost:3000/vacantes"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateSession", () => {
  it("con un usuario válido devuelve la sesión", async () => {
    getUserReturns({ user, error: null });

    const { session } = await run();

    expect(session).toEqual({ status: "signedIn", user });
  });

  it("sin cookie de sesión, es sin sesión", async () => {
    getUserReturns({ user: null, error: new AuthSessionMissingError() });

    const { session } = await run();

    expect(session).toEqual({ status: "signedOut" });
  });

  it("con el token rechazado por Auth, es sin sesión", async () => {
    getUserReturns({
      user: null,
      error: new AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found"),
    });

    const { session } = await run();

    expect(session).toEqual({ status: "signedOut" });
  });

  it.each([
    ["sin red", 0],
    ["con un 503", 503],
  ])("con Auth sin responder (%s), no se pudo validar", async (_, status) => {
    getUserReturns({ user: null, error: new AuthRetryableFetchError("fetch failed", status) });

    const { session } = await run();

    expect(session).toEqual({ status: "unavailable" });
  });
});
