import { beforeEach, describe, expect, it, vi } from "vitest";

import FollowingLayout from "@/app/siguiendo/layout";
import FollowingPage from "@/app/siguiendo/page";
import { getVacanciesAccess, type VacanciesAccess } from "@/app/vacantes/access";
import { loadFollowedTeams } from "@/components/team/followedTeams";

vi.mock("@/app/vacantes/access", () => ({ getVacanciesAccess: vi.fn() }));
vi.mock("@/components/team/followedTeams", () => ({ loadFollowedTeams: vi.fn() }));
vi.mock("@/components/nav/AppShell", () => ({ default: () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
// Como en Next: redirect() y notFound() cortan con una excepción.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

const layout = () => FollowingLayout({ children: null, params: Promise.resolve({}) } as never);
const access = (value: VacanciesAccess) => vi.mocked(getVacanciesAccess).mockResolvedValue(value);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadFollowedTeams).mockResolvedValue([]);
});

describe("layout de /siguiendo", () => {
  it("sin sesión redirige al login con el destino", async () => {
    access("signedOut");

    await expect(layout()).rejects.toThrow("redirect:/login?redirectTo=/siguiendo");
  });

  it("un delegado recibe 404", async () => {
    access("notPlayer");

    await expect(layout()).rejects.toThrow("notFound");
  });

  it.each<VacanciesAccess>(["player", "unavailable"])("con %s renderiza (el rol caído lo resuelve la página)", async (value) => {
    access(value);

    await expect(layout()).resolves.toBeTruthy();
  });
});

describe("página de /siguiendo", () => {
  it("un delegado recibe 404 sin que se carguen los equipos", async () => {
    access("notPlayer");

    await expect(FollowingPage()).rejects.toThrow("notFound");
    expect(loadFollowedTeams).not.toHaveBeenCalled();
  });

  it("sin sesión también corta antes de cargar", async () => {
    access("signedOut");

    await expect(FollowingPage()).rejects.toThrow("notFound");
    expect(loadFollowedTeams).not.toHaveBeenCalled();
  });

  it("si no se pudo leer el rol, tira para que error.tsx ofrezca Reintentar (no es un 404)", async () => {
    access("unavailable");

    await expect(FollowingPage()).rejects.toThrow("No se pudo leer el rol");
    expect(loadFollowedTeams).not.toHaveBeenCalled();
  });

  it("un jugador ve su lista", async () => {
    access("player");

    await expect(FollowingPage()).resolves.toBeTruthy();
    expect(loadFollowedTeams).toHaveBeenCalledTimes(1);
  });
});
