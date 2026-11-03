import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FollowerCount from "@/components/team/FollowerCount";
import TeamFollowControl from "@/components/team/TeamFollowControl";
import { getFollowerCount, isFollowing } from "@/lib/data/follows";
import { getProfileById } from "@/lib/data/profiles";

vi.mock("@/lib/data/follows", () => ({ isFollowing: vi.fn(), getFollowerCount: vi.fn() }));
vi.mock("@/lib/data/profiles", () => ({ getProfileById: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/app/equipos/follow-actions", () => ({}));

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const control = () => TeamFollowControl({ teamId: TEAM_ID, teamName: "Los Pumas" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeamFollowControl", () => {
  it("al jugador le da el botón con el estado de isFollowing", async () => {
    vi.mocked(getProfileById).mockResolvedValue({ role: "player" } as never);
    vi.mocked(isFollowing).mockResolvedValue(true);

    const element = await control();

    expect(isValidElement(element)).toBe(true);
    expect((element as { props: { following: boolean } }).props.following).toBe(true);
  });

  it("al delegado no le muestra el botón ni consulta el seguimiento", async () => {
    vi.mocked(getProfileById).mockResolvedValue({ role: "delegate" } as never);

    expect(await control()).toBeNull();
    expect(isFollowing).not.toHaveBeenCalled();
  });

  it("si la consulta falla no rompe la página", async () => {
    vi.mocked(getProfileById).mockResolvedValue({ role: "player" } as never);
    vi.mocked(isFollowing).mockRejectedValue(new Error("boom"));

    expect(await control()).toBeNull();
  });
});

describe("FollowerCount", () => {
  it.each([
    [0, "0 seguidores"],
    [1, "1 seguidor"],
    [2, "2 seguidores"],
  ])("%i → %s", async (count, label) => {
    vi.mocked(getFollowerCount).mockResolvedValue(count);

    const element = (await FollowerCount({ teamId: TEAM_ID })) as { props: { children: string } };

    expect(element.props.children).toBe(label);
  });

  it("si el contador falla no muestra nada", async () => {
    vi.mocked(getFollowerCount).mockRejectedValue(new Error("boom"));

    expect(await FollowerCount({ teamId: TEAM_ID })).toBeNull();
  });
});
