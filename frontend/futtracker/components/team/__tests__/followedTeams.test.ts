import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadFollowedTeams } from "@/components/team/followedTeams";
import { listFollowedTeams, type FollowedTeam } from "@/lib/data/follows";
import { getCrestSignedUrls } from "@/lib/data/teams";
import { listOpenVacancies } from "@/lib/data/vacancies";

vi.mock("@/lib/data/follows", () => ({ listFollowedTeams: vi.fn() }));
vi.mock("@/lib/data/teams", () => ({ getCrestSignedUrls: vi.fn() }));
vi.mock("@/lib/data/vacancies", () => ({ listOpenVacancies: vi.fn() }));

const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const client = {} as never;

function team(id: string, overrides: Partial<FollowedTeam> = {}): FollowedTeam {
  return { id, name: id, city: null, province: null, category: null, crest_path: null, ...overrides };
}

const vacancy = (team_id: string, position: string) => ({ team_id, position }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCrestSignedUrls).mockResolvedValue(new Map());
});

describe("loadFollowedTeams", () => {
  it("sin equipos seguidos no consulta vacantes", async () => {
    vi.mocked(listFollowedTeams).mockResolvedValue([]);

    expect(await loadFollowedTeams(client)).toEqual([]);
    expect(listOpenVacancies).not.toHaveBeenCalled();
  });

  it("una sola consulta de vacantes y chips agrupados por equipo en el orden de la función", async () => {
    vi.mocked(listFollowedTeams).mockResolvedValue([
      team(E2),
      team(E1, { crest_path: `${E1}/escudo.png` }),
    ]);
    vi.mocked(listOpenVacancies).mockResolvedValue({
      vacancies: [vacancy(E2, "delantero"), vacancy(E1, "arquero"), vacancy(E1, "mediocampista")],
      total: 3,
    });
    vi.mocked(getCrestSignedUrls).mockResolvedValue(new Map([[`${E1}/escudo.png`, "https://firmada"]]));

    const items = await loadFollowedTeams(client);

    expect(listOpenVacancies).toHaveBeenCalledTimes(1);
    expect(listOpenVacancies).toHaveBeenCalledWith(client, { teamIds: [E2, E1], limit: 8, offset: 0 });
    expect(items.map((item) => [item.id, item.openPositions, item.crestUrl])).toEqual([
      [E2, ["delantero"], null],
      [E1, ["arquero", "mediocampista"], "https://firmada"],
    ]);
  });

  it("si fallan las firmas de los escudos, siguen las iniciales", async () => {
    vi.mocked(listFollowedTeams).mockResolvedValue([team(E1, { crest_path: "x.png" })]);
    vi.mocked(listOpenVacancies).mockResolvedValue({ vacancies: [], total: 0 });
    vi.mocked(getCrestSignedUrls).mockRejectedValue(new Error("storage"));

    const [item] = await loadFollowedTeams(client);

    expect(item.crestUrl).toBeNull();
    expect(item.openPositions).toEqual([]);
  });

  it("si fallan las vacantes, falla la carga (la página muestra el error)", async () => {
    vi.mocked(listFollowedTeams).mockResolvedValue([team(E1)]);
    vi.mocked(listOpenVacancies).mockRejectedValue(new Error("boom"));

    await expect(loadFollowedTeams(client)).rejects.toThrow("boom");
  });
});
