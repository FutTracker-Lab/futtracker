import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@/lib/data/applications";

const applyToVacancyMock = vi.fn();
const withdrawApplicationMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/data/applications", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/applications")>(
    "@/lib/data/applications",
  );
  return {
    ...actual,
    applyToVacancy: (...args: unknown[]) => applyToVacancyMock(...args),
    withdrawApplication: (...args: unknown[]) => withdrawApplicationMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const ID = "0a000002-0000-4000-8000-000000000120";

describe("applyToVacancyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("se postula y revalida el board y la página del equipo", async () => {
    const { applyToVacancyAction } = await import("@/app/vacantes/actions");
    applyToVacancyMock.mockResolvedValue({});

    expect(await applyToVacancyAction(ID)).toEqual({ ok: true });
    expect(applyToVacancyMock).toHaveBeenCalledWith({}, ID);
    expect(revalidatePathMock).toHaveBeenCalledWith("/vacantes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/equipos/[id]", "page");
  });

  it.each([
    [{ code: "23505", message: "duplicate key" }, "alreadyApplied"],
    [{ code: "23514", message: "vacancy_closed" }, "vacancyClosed"],
    [
      { code: "23503", message: 'violates "vacancy_applications_player_id_fkey"' },
      "profileIncomplete",
    ],
    [{ code: "42501", message: "denied" }, "unexpected"],
    [new ApplicationError("forbidden"), "unexpected"],
    [new Error("boom"), "unexpected"],
  ])("mapea %o a la clave %s, nunca al texto crudo", async (error, key) => {
    const { applyToVacancyAction } = await import("@/app/vacantes/actions");
    applyToVacancyMock.mockRejectedValue(error);

    expect(await applyToVacancyAction(ID)).toEqual({ ok: false, error: key });
  });

  it("un id inválido no llega a la base", async () => {
    const { applyToVacancyAction } = await import("@/app/vacantes/actions");

    expect(await applyToVacancyAction("x")).toEqual({ ok: false, error: "unexpected" });
    expect(applyToVacancyMock).not.toHaveBeenCalled();
  });
});

describe("withdrawApplicationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retira y revalida", async () => {
    const { withdrawApplicationAction } = await import("@/app/vacantes/actions");
    withdrawApplicationMock.mockResolvedValue(undefined);

    expect(await withdrawApplicationAction(ID)).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/vacantes");
  });

  it("si ya no existía cuenta como retirada", async () => {
    const { withdrawApplicationAction } = await import("@/app/vacantes/actions");
    withdrawApplicationMock.mockRejectedValue(new ApplicationError("notFound"));

    expect(await withdrawApplicationAction(ID)).toEqual({ ok: true });
  });

  it("otro error falla sin revalidar", async () => {
    const { withdrawApplicationAction } = await import("@/app/vacantes/actions");
    withdrawApplicationMock.mockRejectedValue({ code: "XX000" });

    expect(await withdrawApplicationAction(ID)).toEqual({ ok: false });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
