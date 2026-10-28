// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { unfollowTeamAction } from "@/app/equipos/follow-actions";
import { byLabel, cleanup, click, flush, render } from "@/components/player/__tests__/dialogTestUtils";
import FollowedTeamsList from "@/components/team/FollowedTeamsList";
import type { FollowedTeamItem } from "@/components/team/followedTeams";

vi.mock("@/app/equipos/follow-actions", () => ({ unfollowTeamAction: vi.fn() }));

const unfollowMock = vi.mocked(unfollowTeamAction);
const E1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const E2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function item(overrides: Partial<FollowedTeamItem>): FollowedTeamItem {
  return {
    id: E1,
    name: "Club Atlético Pilar",
    city: "Pilar",
    province: "Buenos Aires",
    category: "Primera",
    crest_path: null,
    crestUrl: null,
    openPositions: [],
    ...overrides,
  };
}

const E2_ITEM = item({ id: E2, name: "Racing de Rosario", city: "Rosario", category: "Reserva", openPositions: ["delantero"] });
const E1_ITEM = item({ openPositions: ["arquero", "mediocampista"] });

const rows = () => Array.from(document.querySelectorAll("ul.flex-col > li"));
const text = () => document.body.textContent ?? "";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FollowedTeamsList", () => {
  it("una fila por equipo en el orden recibido, con ciudad, categoría y chips", () => {
    render(<FollowedTeamsList teams={[E2_ITEM, E1_ITEM]} />);

    expect(rows().map((row) => row.querySelector("h2")?.textContent)).toEqual([
      "Racing de Rosario",
      "Club Atlético Pilar",
    ]);
    expect(rows()[0].textContent).toContain("Rosario · Reserva");

    const chips = (label: string) =>
      Array.from(byLabel(label)?.querySelectorAll("li") ?? []).map((chip) => chip.textContent);

    expect(chips("Vacantes abiertas de Club Atlético Pilar")).toEqual(["Busca Arquero", "Busca Mediocampista"]);
    expect(chips("Vacantes abiertas de Racing de Rosario")).toEqual(["Busca Delantero"]);
    expect(text()).not.toContain("Busca Defensor");
  });

  it("sin vacantes abiertas lo dice e incluye la inicial del escudo", () => {
    render(<FollowedTeamsList teams={[item({ id: E2, name: "Deportivo Córdoba" })]} />);

    expect(text()).toContain("Sin vacantes abiertas");
    expect(text()).toContain("DC");
  });

  it("'Ver equipo' lleva a la página del equipo", () => {
    render(<FollowedTeamsList teams={[E1_ITEM]} />);

    const link = Array.from(document.querySelectorAll("a")).find((a) => a.textContent === "Ver equipo");
    expect(link?.getAttribute("href")).toBe(`/equipos/${E1}`);
  });

  it("dejar de seguir saca la fila sin confirmar, avisa y mueve el foco a la fila que queda", async () => {
    unfollowMock.mockResolvedValue({ ok: true });
    render(<FollowedTeamsList teams={[E2_ITEM, E1_ITEM]} />);

    click(byLabel("Dejar de seguir a Racing de Rosario")!);
    await flush();

    expect(unfollowMock).toHaveBeenCalledWith(E2);
    expect(document.querySelector("dialog")).toBeNull();
    expect(rows()).toHaveLength(1);
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Dejaste de seguir a Racing de Rosario.");
    expect(document.activeElement).toBe(byLabel("Dejar de seguir a Club Atlético Pilar"));
  });

  it("al sacar la última fila queda el estado vacío con el foco en 'Ver vacantes'", async () => {
    unfollowMock.mockResolvedValue({ ok: true });
    render(<FollowedTeamsList teams={[E1_ITEM]} />);

    click(byLabel("Dejar de seguir a Club Atlético Pilar")!);
    await flush();

    expect(text()).toContain("Todavía no seguís a ningún equipo.");
    expect(document.activeElement?.textContent).toBe("Ver vacantes");
  });

  it("si falla, la fila queda y el toast de error no muestra texto crudo", async () => {
    unfollowMock.mockRejectedValue(new Error("fetch failed"));
    render(<FollowedTeamsList teams={[E1_ITEM]} />);

    click(byLabel("Dejar de seguir a Club Atlético Pilar")!);
    await flush();

    expect(rows()).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "No pudimos actualizar el seguimiento. Probá de nuevo.",
    );
  });

  it("vacío: mensaje y 'Ver vacantes' hacia /vacantes", () => {
    render(<FollowedTeamsList teams={[]} />);

    expect(text()).toContain("Todavía no seguís a ningún equipo.");
    const link = Array.from(document.querySelectorAll("a")).find((a) => a.textContent === "Ver vacantes");
    expect(link?.getAttribute("href")).toBe("/vacantes");
  });
});
