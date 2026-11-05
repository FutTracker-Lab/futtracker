import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyTeamPage from "@/app/equipos/mi-equipo/page";
import NewTeamPage from "@/app/equipos/nuevo/page";
import { getProfileById, type ProfileResult } from "@/lib/data/profiles";
import { getMyTeam } from "@/lib/data/teams";

vi.mock("@/lib/data/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/data/teams", () => ({ getMyTeam: vi.fn() }));
vi.mock("@/lib/data/teamProfiles", () => ({ getTeamProfileById: vi.fn() }));
vi.mock("@/lib/data/zones", () => ({ listZones: vi.fn(async () => []) }));
vi.mock("@/components/team/TeamForm", () => ({ default: () => null }));
vi.mock("@/components/team/ApplicationsTab", () => ({ default: () => null }));
vi.mock("@/components/team/FollowersTab", () => ({ default: () => null }));
vi.mock("@/components/team/VacanciesTab", () => ({ default: () => null }));
vi.mock("@/components/team/TeamTabs", () => ({ default: () => null }));
vi.mock("@/components/team/OpenVacanciesChip", () => ({ default: () => null }));
vi.mock("@/components/team/teamApplications", () => ({}));
vi.mock("@/components/team/teamFollowers", () => ({}));
vi.mock("@/components/team/teamVacancies", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

const withProfile = (result: ProfileResult) => vi.mocked(getProfileById).mockResolvedValue(result);
const found = (role: string) => ({ kind: "found", profile: { role } }) as ProfileResult;
const myTeam = () => MyTeamPage({ searchParams: Promise.resolve({}) } as never);
const text = (element: ReactElement) => renderToStaticMarkup(element);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMyTeam).mockResolvedValue(null);
});

describe("/equipos/nuevo", () => {
  it("si falla la lectura tira para error.tsx en vez de negarle el permiso al delegado", async () => {
    withProfile({ kind: "error" });

    await expect(NewTeamPage()).rejects.toThrow("No se pudo leer el perfil");
  });

  it("un jugador ve el mensaje de permiso", async () => {
    withProfile(found("player"));

    expect(text(await NewTeamPage())).toContain("Solo los delegados pueden crear equipos");
  });

  it("un perfil inexistente ve el mensaje de permiso", async () => {
    withProfile({ kind: "notFound" });

    expect(text(await NewTeamPage())).toContain("Solo los delegados pueden crear equipos");
  });

  it("un delegado ve el formulario", async () => {
    withProfile(found("delegate"));

    expect(text(await NewTeamPage())).toContain("Creá tu equipo");
  });
});

describe("/equipos/mi-equipo", () => {
  it("si falla la lectura tira para error.tsx en vez de mandar a mi-perfil", async () => {
    withProfile({ kind: "error" });

    await expect(myTeam()).rejects.toThrow("No se pudo leer el perfil");
  });

  it("un jugador va a su perfil", async () => {
    withProfile(found("player"));

    await expect(myTeam()).rejects.toThrow("redirect:/jugadores/mi-perfil");
  });

  it("un perfil inexistente va a mi-perfil", async () => {
    withProfile({ kind: "notFound" });

    await expect(myTeam()).rejects.toThrow("redirect:/jugadores/mi-perfil");
  });

  it("un delegado sin equipo ve el estado vacío", async () => {
    withProfile(found("delegate"));

    expect(text(await myTeam())).toContain("Todavía no tenés equipo");
  });
});
