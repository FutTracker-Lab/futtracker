import { beforeEach, describe, expect, it, vi } from "vitest";

import PlayerSearchLayout from "@/app/jugadores/(busqueda)/layout";
import PlayerSearchPage from "@/app/jugadores/(busqueda)/page";
import { searchPlayers } from "@/lib/data/players";
import { getProfileById, type ProfileResult } from "@/lib/data/profiles";
import { getMyTeam } from "@/lib/data/teams";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/data/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/data/players", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/players")>()),
  searchPlayers: vi.fn(),
}));
vi.mock("@/lib/data/teams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/teams")>()),
  getMyTeam: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

const CHILDREN = "contenido";

const layout = () => PlayerSearchLayout({ children: CHILDREN });
const page = () => PlayerSearchPage({ searchParams: Promise.resolve({}) } as never);

function signedInAs(result: ProfileResult) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  } as never);
  vi.mocked(getProfileById).mockResolvedValue(result);
  vi.mocked(searchPlayers).mockResolvedValue({ ok: false, reason: "origin_missing" });
  vi.mocked(getMyTeam).mockResolvedValue(null);
}

const found = (role: string) => ({ kind: "found", profile: { role } }) as ProfileResult;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layout de /jugadores", () => {
  it("sin sesión redirige al login con el destino", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);

    await expect(layout()).rejects.toThrow("redirect:/login?redirectTo=/jugadores");
  });

  it("un jugador recibe 404", async () => {
    signedInAs(found("player"));

    await expect(layout()).rejects.toThrow("notFound");
  });

  it("un perfil inexistente recibe 404", async () => {
    signedInAs({ kind: "notFound" });

    await expect(layout()).rejects.toThrow("notFound");
  });

  it("un delegado ve la búsqueda", async () => {
    signedInAs(found("delegate"));

    await expect(layout()).resolves.toBe(CHILDREN);
  });

  it("si falla la lectura no da 404: lo resuelve la página", async () => {
    signedInAs({ kind: "error" });

    await expect(layout()).resolves.toBe(CHILDREN);
  });
});

describe("resultados de /jugadores", () => {
  it("si falla la lectura tira para que error.tsx ofrezca Reintentar, sin buscar", async () => {
    signedInAs({ kind: "error" });

    await expect(page()).rejects.toThrow("No se pudo leer el perfil");
    expect(searchPlayers).not.toHaveBeenCalled();
  });

  it("un delegado recibe los resultados en el mismo render, sin streaming", async () => {
    signedInAs(found("delegate"));

    await expect(page()).resolves.toBeTruthy();
    expect(searchPlayers).toHaveBeenCalledTimes(1);
  });
});
