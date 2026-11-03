import { beforeEach, describe, expect, it, vi } from "vitest";

import { FollowError } from "@/lib/data/follows";

const followTeamMock = vi.fn();
const unfollowTeamMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/data/follows", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/follows")>("@/lib/data/follows");
  return {
    ...actual,
    followTeam: (...args: unknown[]) => followTeamMock(...args),
    unfollowTeam: (...args: unknown[]) => unfollowTeamMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("followTeamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sigue y revalida la página del equipo y Siguiendo", async () => {
    const { followTeamAction } = await import("@/app/equipos/follow-actions");
    followTeamMock.mockResolvedValue(undefined);

    expect(await followTeamAction(TEAM_ID)).toEqual({ ok: true });
    expect(followTeamMock).toHaveBeenCalledWith({}, TEAM_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/equipos/${TEAM_ID}`);
    expect(revalidatePathMock).toHaveBeenCalledWith("/siguiendo");
  });

  it("si ya lo seguía cuenta como seguido", async () => {
    const { followTeamAction } = await import("@/app/equipos/follow-actions");
    followTeamMock.mockRejectedValue({ code: "23505", message: "duplicate key" });

    expect(await followTeamAction(TEAM_ID)).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  it("equipo borrado: teamNotFound sin revalidar", async () => {
    const { followTeamAction } = await import("@/app/equipos/follow-actions");
    followTeamMock.mockRejectedValue({
      code: "23503",
      message: 'violates foreign key constraint "team_follows_team_id_fkey"',
    });

    expect(await followTeamAction(TEAM_ID)).toEqual({ ok: false, error: "teamNotFound" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "42501", message: "denied" }],
    [new FollowError("forbidden")],
    [new Error("boom")],
  ])("cualquier otro error (%o) es unexpected, nunca el texto crudo", async (error) => {
    const { followTeamAction } = await import("@/app/equipos/follow-actions");
    followTeamMock.mockRejectedValue(error);

    expect(await followTeamAction(TEAM_ID)).toEqual({ ok: false, error: "unexpected" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("un id inválido no llega a la base", async () => {
    const { followTeamAction } = await import("@/app/equipos/follow-actions");

    expect(await followTeamAction("x")).toEqual({ ok: false, error: "unexpected" });
    expect(followTeamMock).not.toHaveBeenCalled();
  });
});

describe("unfollowTeamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deja de seguir y revalida", async () => {
    const { unfollowTeamAction } = await import("@/app/equipos/follow-actions");
    unfollowTeamMock.mockResolvedValue(undefined);

    expect(await unfollowTeamAction(TEAM_ID)).toEqual({ ok: true });
    expect(unfollowTeamMock).toHaveBeenCalledWith({}, TEAM_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith("/siguiendo");
  });

  it("un error falla sin revalidar", async () => {
    const { unfollowTeamAction } = await import("@/app/equipos/follow-actions");
    unfollowTeamMock.mockRejectedValue({ code: "XX000" });

    expect(await unfollowTeamAction(TEAM_ID)).toEqual({ ok: false, error: "unexpected" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("un id inválido no llega a la base", async () => {
    const { unfollowTeamAction } = await import("@/app/equipos/follow-actions");

    expect(await unfollowTeamAction(42)).toEqual({ ok: false, error: "unexpected" });
    expect(unfollowTeamMock).not.toHaveBeenCalled();
  });
});
