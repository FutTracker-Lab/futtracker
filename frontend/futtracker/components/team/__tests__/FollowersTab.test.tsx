// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FollowersTab from "@/components/team/FollowersTab";
import { loadFollowerRows, loadTeamFollowers, type FollowerRowsResult } from "@/components/team/teamFollowers";
import { listTeamFollowers, type TeamFollower } from "@/lib/data/follows";
import { getAvatarSignedUrls } from "@/lib/data/players";

vi.mock("@/lib/data/follows", () => ({ listTeamFollowers: vi.fn() }));
vi.mock("@/lib/data/players", () => ({ getAvatarSignedUrls: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PJ1 = "11111111-1111-4111-8111-111111111111";
const PJ2 = "22222222-2222-4222-8222-222222222222";
const client = {} as never;

function follower(overrides: Partial<TeamFollower>): TeamFollower {
  return {
    follower_id: PJ1,
    full_name: "Lucía Fernández",
    avatar_path: null,
    position: "delantero",
    city: "Pilar",
    created_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

async function renderTab(result: FollowerRowsResult) {
  const ui = await FollowersTab({ result: Promise.resolve(result) });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
}

const rows = () => Array.from(container.querySelectorAll("li"));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe("loadFollowerRows", () => {
  it("firma los avatares que existen y deja null el resto", async () => {
    vi.mocked(listTeamFollowers).mockResolvedValue([
      follower({ follower_id: PJ2, full_name: "Martín Gómez" }),
      follower({ avatar_path: `${PJ1}/avatar.png` }),
    ]);
    vi.mocked(getAvatarSignedUrls).mockResolvedValue(new Map([[`${PJ1}/avatar.png`, "https://firmada"]]));

    const loaded = await loadFollowerRows(client, loadTeamFollowers(client, TEAM_ID));

    expect(getAvatarSignedUrls).toHaveBeenCalledWith(client, [`${PJ1}/avatar.png`]);
    expect(loaded.ok && loaded.followers.map((row) => row.avatarUrl)).toEqual([null, "https://firmada"]);
  });

  it("si falla la lista devuelve el error sin firmar nada", async () => {
    vi.mocked(listTeamFollowers).mockRejectedValue(new Error("boom"));

    expect(await loadFollowerRows(client, loadTeamFollowers(client, TEAM_ID))).toEqual({ ok: false });
    expect(getAvatarSignedUrls).not.toHaveBeenCalled();
  });

  it("si fallan las firmas siguen las filas con iniciales", async () => {
    vi.mocked(listTeamFollowers).mockResolvedValue([follower({ avatar_path: "x.png" })]);
    vi.mocked(getAvatarSignedUrls).mockRejectedValue(new Error("storage"));

    const loaded = await loadFollowerRows(client, loadTeamFollowers(client, TEAM_ID));

    expect(loaded.ok && loaded.followers[0].avatarUrl).toBeNull();
  });
});

describe("FollowersTab", () => {
  it("una fila por seguidor en el orden recibido, con posición, ciudad y 'Ver perfil'", async () => {
    const martin = follower({ follower_id: PJ2, full_name: "Martín Gómez", position: "arquero", city: "Rosario" });
    await renderTab({
      ok: true,
      followers: [
        { ...martin, avatarUrl: null },
        { ...follower({}), avatarUrl: null },
      ],
    });

    expect(rows().map((row) => row.querySelector("p")?.textContent)).toEqual(["Martín Gómez", "Lucía Fernández"]);
    expect(rows()[0].textContent).toContain("Arquero · Rosario");
    expect(rows().map((row) => row.querySelector("a")?.getAttribute("href"))).toEqual([
      `/jugadores/${PJ2}`,
      `/jugadores/${PJ1}`,
    ]);
    expect(rows()[0].querySelector("a")?.textContent).toBe("Ver perfil de Martín Gómez");
  });

  it("sin fila en players omite posición y ciudad", async () => {
    await renderTab({
      ok: true,
      followers: [{ ...follower({ position: null, city: null }), avatarUrl: null }],
    });

    expect(rows()[0].querySelectorAll("p")).toHaveLength(1);
    expect(rows()[0].textContent).toContain("LF");
  });

  it("vacío", async () => {
    await renderTab({ ok: true, followers: [] });

    expect(container.textContent).toContain("Todavía no tenés seguidores.");
  });

  it("error con Reintentar", async () => {
    await renderTab({ ok: false });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("No pudimos cargar los seguidores.");
    expect(container.querySelector("button")?.textContent).toBe("Reintentar");
  });
});
