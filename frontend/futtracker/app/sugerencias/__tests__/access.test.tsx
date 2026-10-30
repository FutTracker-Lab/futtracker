import { beforeEach, describe, expect, it, vi } from "vitest";

import SuggestionsLayout from "@/app/sugerencias/layout";
import SuggestionsPage from "@/app/sugerencias/page";
import { getPlayerAccess, type PlayerAccess } from "@/lib/auth/playerAccess";
import { suggestTeams } from "@/lib/data/suggestions";

vi.mock("@/lib/auth/playerAccess", () => ({ getPlayerAccess: vi.fn() }));
vi.mock("@/lib/data/suggestions", () => ({ suggestTeams: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/app/vacantes/actions", () => ({ applyToVacancyAction: vi.fn() }));
vi.mock("@/components/nav/AppShell", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

function withAccess(access: PlayerAccess) {
  vi.mocked(getPlayerAccess).mockResolvedValue(access);
}

const layout = () =>
  SuggestionsLayout({ children: null } as unknown as Parameters<typeof SuggestionsLayout>[0]);
const page = () =>
  SuggestionsPage({ searchParams: Promise.resolve({}) } as unknown as Parameters<
    typeof SuggestionsPage
  >[0]);

beforeEach(() => {
  vi.mocked(suggestTeams).mockReset();
});

describe("layout de /sugerencias", () => {
  it("sin sesión redirige al login", async () => {
    withAccess("signedOut");

    await expect(layout()).rejects.toThrow("NEXT_REDIRECT /login?redirectTo=/sugerencias");
  });

  it("un delegado ve el 404", async () => {
    withAccess("notPlayer");

    await expect(layout()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("con el rol caído deja pasar para que la página muestre el error", async () => {
    withAccess("unavailable");

    await expect(layout()).resolves.toBeTruthy();
  });

  it("un jugador entra", async () => {
    withAccess("player");

    await expect(layout()).resolves.toBeTruthy();
  });
});

describe("página de /sugerencias", () => {
  it("con el rol caído falla, para que error.tsx ofrezca Reintentar", async () => {
    withAccess("unavailable");

    await expect(page()).rejects.toThrow("No se pudo leer el rol");
  });

  it.each(["signedOut", "notPlayer"] as const)(
    "con %s responde 404 sin pedir sugerencias",
    async (access) => {
      withAccess(access);

      await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
      expect(suggestTeams).not.toHaveBeenCalled();
    },
  );

  it("un jugador recibe la página", async () => {
    withAccess("player");

    await expect(page()).resolves.toBeTruthy();
  });
});
