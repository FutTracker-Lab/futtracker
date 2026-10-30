// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { followTeamAction, unfollowTeamAction } from "@/app/equipos/follow-actions";
import { cleanup, click, flush, render } from "@/components/player/__tests__/dialogTestUtils";
import FollowButton from "@/components/team/FollowButton";

vi.mock("@/app/equipos/follow-actions", () => ({
  followTeamAction: vi.fn(),
  unfollowTeamAction: vi.fn(),
}));

const followMock = vi.mocked(followTeamAction);
const unfollowMock = vi.mocked(unfollowTeamAction);
const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function renderButton(following = false) {
  render(<FollowButton teamId={TEAM_ID} teamName="Los Pumas" following={following} />);
}

const button = () => document.querySelector<HTMLButtonElement>("button[aria-pressed]")!;
const toast = (role: "status" | "alert") => document.querySelector(`[role="${role}"]`)?.textContent;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FollowButton", () => {
  it.each([
    [false, "Seguir", "false"],
    [true, "Siguiendo", "true"],
  ])("following=%s muestra %s con aria-pressed=%s", (following, label, pressed) => {
    renderButton(following);

    expect(button().textContent).toBe(label);
    expect(button().getAttribute("aria-pressed")).toBe(pressed);
  });

  it("Seguir pasa a Siguiendo con su toast", async () => {
    followMock.mockResolvedValue({ ok: true });
    renderButton();

    click(button());
    await flush();

    expect(followMock).toHaveBeenCalledWith(TEAM_ID);
    expect(button().textContent).toBe("Siguiendo");
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(toast("status")).toBe("Ahora seguís a Los Pumas.");
  });

  it("Siguiendo deja de seguir sin confirmar", async () => {
    unfollowMock.mockResolvedValue({ ok: true });
    renderButton(true);

    click(button());
    await flush();

    expect(unfollowMock).toHaveBeenCalledWith(TEAM_ID);
    expect(document.querySelector("dialog")).toBeNull();
    expect(button().textContent).toBe("Seguir");
    expect(toast("status")).toBe("Dejaste de seguir a Los Pumas.");
  });

  it("mientras envía queda deshabilitado, conserva el foco e ignora otro clic", async () => {
    let resolve!: (value: { ok: true }) => void;
    followMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderButton();

    click(button());
    await flush();

    expect(button().getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button());

    click(button());
    expect(followMock).toHaveBeenCalledTimes(1);

    resolve({ ok: true });
    await flush();

    expect(button().getAttribute("aria-disabled")).toBe("false");
    expect(document.activeElement).toBe(button());
  });

  it("equipo borrado: toast de error y sigue en Seguir", async () => {
    followMock.mockResolvedValue({ ok: false, error: "teamNotFound" });
    renderButton();

    click(button());
    await flush();

    expect(button().textContent).toBe("Seguir");
    expect(toast("alert")).toBe("Este equipo ya no existe.");
  });

  it("si la acción revienta muestra el mensaje genérico, nunca el texto crudo", async () => {
    followMock.mockRejectedValue(new Error("fetch failed"));
    renderButton();

    click(button());
    await flush();

    expect(toast("alert")).toBe("No pudimos actualizar el seguimiento. Probá de nuevo.");
    expect(document.body.textContent).not.toContain("fetch failed");
  });
});
