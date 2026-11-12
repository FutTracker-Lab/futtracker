import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OpenVacanciesSection from "@/components/team/OpenVacanciesSection";
import { listMyApplications } from "@/lib/data/applications";
import { getMyPlayer } from "@/lib/data/players";
import { getProfileById, type ProfileResult } from "@/lib/data/profiles";
import { listOpenVacancies } from "@/lib/data/vacancies";

vi.mock("@/components/vacancies/VacancyApplyControl", () => ({
  default: () => <span>Postularme</span>,
}));
vi.mock("@/lib/data/applications", () => ({ listMyApplications: vi.fn() }));
vi.mock("@/lib/data/players", () => ({ getMyPlayer: vi.fn() }));
vi.mock("@/lib/data/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/data/vacancies", () => ({ listOpenVacancies: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));

const section = async () =>
  renderToStaticMarkup(await OpenVacanciesSection({ teamId: "t1", teamName: "Los Pumas" }));
const found = (role: string) => ({ kind: "found", profile: { role } }) as ProfileResult;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listOpenVacancies).mockResolvedValue({
    vacancies: [
      {
        id: "v1",
        position: "arquero",
        modality: "f5",
        level: "amateur",
        description: null,
        created_at: "2026-10-01T00:00:00Z",
      },
    ],
  } as never);
  vi.mocked(listMyApplications).mockResolvedValue([]);
  vi.mocked(getMyPlayer).mockResolvedValue(null);
});

describe("OpenVacanciesSection", () => {
  it("al jugador le ofrece postularse", async () => {
    vi.mocked(getProfileById).mockResolvedValue(found("player"));

    expect(await section()).toContain("Postularme");
  });

  it("al delegado le muestra las vacantes sin postularse", async () => {
    vi.mocked(getProfileById).mockResolvedValue(found("delegate"));

    const html = await section();

    expect(html).not.toContain("Postularme");
    expect(html).not.toContain("No pudimos cargar las vacantes.");
  });

  it("si falla la lectura del perfil avisa, no esconde el botón en silencio", async () => {
    vi.mocked(getProfileById).mockResolvedValue({ kind: "error" });

    expect(await section()).toContain("No pudimos cargar las vacantes.");
  });
});
