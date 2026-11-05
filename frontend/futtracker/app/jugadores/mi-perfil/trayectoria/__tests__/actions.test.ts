import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createCareerEntry: vi.fn(),
  updateCareerEntry: vi.fn(),
  deleteCareerEntry: vi.fn(),
  getCareerEntryById: vi.fn(),
}));

vi.mock("@/lib/auth/requireSession", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/careerEntries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/careerEntries")>(
    "@/lib/data/careerEntries",
  );
  return {
    ...actual,
    createCareerEntry: mocks.createCareerEntry,
    updateCareerEntry: mocks.updateCareerEntry,
    deleteCareerEntry: mocks.deleteCareerEntry,
    getCareerEntryById: mocks.getCareerEntryById,
  };
});

const {
  createCareerEntryAction,
  createMatchStatAction,
  deleteCareerEntryAction,
  deleteMatchStatAction,
  updateCareerEntryAction,
  updateMatchStatAction,
} = await import("../actions");

const ENTRY = "0a000002-0000-4000-8000-000000000091";
const MATCH = "0a000002-0000-4000-8000-000000000092";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sin sesión", () => {
  it.each([
    ["createCareerEntryAction", () => createCareerEntryAction({})],
    ["updateCareerEntryAction", () => updateCareerEntryAction(ENTRY, {})],
    ["deleteCareerEntryAction", () => deleteCareerEntryAction(ENTRY)],
    ["createMatchStatAction", () => createMatchStatAction(ENTRY, {})],
    ["updateMatchStatAction", () => updateMatchStatAction(ENTRY, MATCH, {})],
    ["deleteMatchStatAction", () => deleteMatchStatAction(ENTRY, MATCH)],
  ])("%s deja pasar el redirect y no toca la base", async (_name, run) => {
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireSession.mockRejectedValueOnce(redirectError);

    await expect(run()).rejects.toBe(redirectError);
    expect(mocks.getCareerEntryById).not.toHaveBeenCalled();
    expect(mocks.createCareerEntry).not.toHaveBeenCalled();
    expect(mocks.updateCareerEntry).not.toHaveBeenCalled();
    expect(mocks.deleteCareerEntry).not.toHaveBeenCalled();
  });
});
